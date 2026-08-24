"use strict";

module("NovelpiaParser");

QUnit.test("extractNovelNo", function (assert) {
    assert.equal(NovelpiaParser.extractNovelNo("https://novelpia.com/novel/12345"), "12345");
    assert.throws(() => NovelpiaParser.extractNovelNo("https://novelpia.com/viewer/999"));
});

QUnit.test("parseEpisodeList", function (assert) {
    let html =
        `<li><i class="bookmark" id="bookmark_111"></i><b>First chapter</b><span>EP.1</span></li>` +
        `<li><i class="bookmark" id="bookmark_222"></i><b>Second chapter</b><span>EP.2</span></li>` +
        `<li><i class="bookmark" id="bookmark_333"></i><b>Extra</b><span>BONUS</span></li>`;
    let chapters = NovelpiaParser.parseEpisodeList(html);
    assert.equal(chapters.length, 3);
    assert.deepEqual(chapters[0], { id: "111", title: "First chapter" });
    assert.deepEqual(chapters[2], { id: "333", title: "Extra" });
});

QUnit.test("parseEpisodeList-empty", function (assert) {
    assert.equal(NovelpiaParser.parseEpisodeList("<html></html>").length, 0);
});
