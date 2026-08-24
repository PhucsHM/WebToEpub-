"use strict";

parserFactory.register("novelpia.com", () => new NovelpiaParser());

/**
 * novelpia.com (Korean site) has no normal chapter pages: the chapter
 * list and chapter text both come from POST-only JSON/HTML endpoints
 * that require a logged-in session. The extension's own cookies (from
 * the user being logged in, in this same browser) cover the login step.
 */
class NovelpiaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let novelNo = NovelpiaParser.extractNovelNo(dom.baseURI);
        let seen = new Set();
        let chapters = [];
        for (let page = 1; ; ++page) {
            let html = await NovelpiaParser.fetchEpisodeListPage(novelNo, page);
            let found = NovelpiaParser.parseEpisodeList(html);
            let fresh = found.filter(c => !seen.has(c.id));
            if (fresh.length === 0) {
                break;
            }
            fresh.forEach(c => seen.add(c.id));
            chapters.push(...fresh);
        }
        chapters.reverse();
        return chapters.map(c => ({
            sourceUrl: `https://novelpia.com/viewer/${c.id}`,
            title: c.title
        }));
    }

    static extractNovelNo(url) {
        let match = new URL(url).pathname.match(/\/novel\/(\d+)/);
        if (match === null) {
            throw new Error("Start from the novel's main page, e.g. https://novelpia.com/novel/12345");
        }
        return match[1];
    }

    static async fetchEpisodeListPage(novelNo, page) {
        let response = await HttpClient.fetchText("https://novelpia.com/proc/episode_list", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: `novel_no=${novelNo}&sort=DOWN&page=${page}`
        });
        return response.text;
    }

    /** each row: id="bookmark_<id>"></i><title...></b> ... EP.<n> or BONUS */
    static parseEpisodeList(html) {
        let regex = /id="bookmark_(\d+)"><\/i>(.+?)<\/b>.+?>(EP\.\d+|BONUS)</gs;
        let out = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            out.push({ id: match[1], title: match[2].replace(/<[^>]+>/g, "").trim() });
        }
        return out;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    async fetchChapter(url) {
        let chapterIdMatch = url.match(/\/viewer\/(\d+)/);
        if (chapterIdMatch === null) {
            throw new Error(`Not a novelpia chapter URL: ${url}`);
        }
        let response = await HttpClient.fetchJson(`https://novelpia.com/proc/viewer_data/${chapterIdMatch[1]}`, {
            method: "POST",
            credentials: "include"
        });
        let segments = response.json?.s;
        if (segments === undefined) {
            throw new Error("Chapter content missing. Check you are logged in to novelpia.com and own this chapter.");
        }
        let newDoc = Parser.makeEmptyDocForContent(url);
        for (let segment of segments) {
            let text = NovelpiaParser.decodeFontObfuscation(segment.text ?? "");
            util.parseHtmlAndInsertIntoContent(`<p>${text}</p>`, newDoc.content);
        }
        return newDoc.dom;
    }

    /**
     * ponytail: novelpia swaps some glyphs to a custom web font as a
     * copy-paste deterrent. There is no bundled mapping table to undo
     * this (the reference tool this was ported from requires the user
     * to supply one externally, and it can go stale as the site updates
     * its font). Passing text through unmodified until a mapping is
     * wired in here.
     */
    static decodeFontObfuscation(text) {
        return text;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("meta[property='og:title']")?.content ?? dom.querySelector("title");
    }
}
