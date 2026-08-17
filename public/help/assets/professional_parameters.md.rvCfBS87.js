import { _ as _export_sfc, o as openBlock, c as createElementBlock, a2 as createStaticVNode } from "./chunks/framework.ZXCZ9mzl.js";
const __pageData = JSON.parse('{"title":"参数解译","description":"","frontmatter":{},"headers":[],"relativePath":"professional/parameters.md","filePath":"professional/parameters.md","lastUpdated":1785583660000}');
const _sfc_main = { name: "professional/parameters.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<h1 id="参数解译" tabindex="-1">参数解译 <a class="header-anchor" href="#参数解译" aria-label="Permalink to &quot;参数解译&quot;">​</a></h1><p>参数解译按工程师确认的最终土层大类匹配适用方法。行级分类仍保留为证据，但不会覆盖最终分层决定。</p><h2 id="choose" tabindex="-1">选择需要的参数 <a class="header-anchor" href="#choose" aria-label="Permalink to &quot;选择需要的参数 {#choose}&quot;">​</a></h2><p>打开参数向导。系统列出可计算、需要确认、不计算和无法计算的参数。按需要勾选，不必把所有参数都算完。</p><p>每个参数只提供固定方法和必要输入。无法计算的项目显示灰色，并说明缺少什么。</p><h2 id="invalid-points" tabindex="-1">处理无效点 <a class="header-anchor" href="#invalid-points" aria-label="Permalink to &quot;处理无效点 {#invalid-points}&quot;">​</a></h2><p>某些深度无法计算时，点击“存在问题”查看：</p><ul><li>原因</li><li>影响的行和层</li><li>是否仍有其他有效点</li><li>可选处理</li></ul><p>可以选择忽略无效点后继续计算，包括强制忽略。原始测量保留，结果中记录忽略范围。没有必要返回数据检查并重做分层。</p><h2 id="finish" tabindex="-1">完成本次解译 <a class="header-anchor" href="#finish" aria-label="Permalink to &quot;完成本次解译 {#finish}&quot;">​</a></h2><p>当已选参数足够时，点击“完成已选参数解译并进入成果输出”。未选择参数保持未计算，不影响已选结果。</p><h2 id="完成信号" tabindex="-1">完成信号 <a class="header-anchor" href="#完成信号" aria-label="Permalink to &quot;完成信号&quot;">​</a></h2><div class="task-check">页面显示已完成参数数量和有效值，完成按钮可用；点击后成果输出读取当前分层修订和当前参数试算。</div><h2 id="出现问题" tabindex="-1">出现问题 <a class="header-anchor" href="#出现问题" aria-label="Permalink to &quot;出现问题&quot;">​</a></h2><div class="task-recovery">如果整层都不适用，返回分层页检查工程大类。只有零散点无效时，在当前参数内忽略并继续，不要改原始数据。</div>', 15)
  ])]);
}
const parameters = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  parameters as default
};
