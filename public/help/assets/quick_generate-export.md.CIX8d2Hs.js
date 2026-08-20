import { _ as _export_sfc, o as openBlock, c as createElementBlock, a2 as createStaticVNode } from "./chunks/framework.ZXCZ9mzl.js";
const _imports_0 = "/help/images/workflow/quick-report-location.png";
const __pageData = JSON.parse('{"title":"快捷出图：生成、阅读与导出","description":"","frontmatter":{},"headers":[],"relativePath":"quick/generate-export.md","filePath":"quick/generate-export.md","lastUpdated":1785583660000}');
const _sfc_main = { name: "quick/generate-export.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<h1 id="快捷出图-生成、阅读与导出" tabindex="-1">快捷出图：生成、阅读与导出 <a class="header-anchor" href="#快捷出图-生成、阅读与导出" aria-label="Permalink to &quot;快捷出图：生成、阅读与导出&quot;">​</a></h1><figure class="manual-shot"><img src="' + _imports_0 + '" alt="快捷图册阅读页，中央为当前图页，右侧为页面缩略图和导出操作"><figcaption>中央阅读当前页，右侧切换图页；顶部可修改输入、导出 Excel 或导出 PDF。</figcaption></figure><h2 id="settings" tabindex="-1">确认图册信息 <a class="header-anchor" href="#settings" aria-label="Permalink to &quot;确认图册信息 {#settings}&quot;">​</a></h2><p>填写孔位名称。有 u2 时选择：</p><ul><li>按总孔压计算：确认 u2 包含静水压力，允许使用孔压相关方法。</li><li>不确定，只展示原始 u2：仍生成图册，但不计算 Schneider、Bq 等孔压方法。</li></ul><p>高级设置默认不需要改。只有确认探头有效面积比时再修改。</p><h2 id="generate" tabindex="-1">生成图册 <a class="header-anchor" href="#generate" aria-label="Permalink to &quot;生成图册 {#generate}&quot;">​</a></h2><p>点击“确认并生成图册”。运行期间按钮显示正在生成，不能重复点击。输入改变后，旧图册会标记需要更新。</p><h2 id="read" tabindex="-1">阅读图册 <a class="header-anchor" href="#read" aria-label="Permalink to &quot;阅读图册 {#read}&quot;">​</a></h2><p>右侧缩略图用于切页。AI 图册解读只能读取当前已生成页面、方法和有限深度数据，不能导入、修改或重新计算。</p><h2 id="export" tabindex="-1">导出 <a class="header-anchor" href="#export" aria-label="Permalink to &quot;导出 {#export}&quot;">​</a></h2><ul><li>“导出完整 PDF”生成 A3、600 DPI 图册。</li><li>“导出 Excel”包含原始数据、分类、解译结果和方法设置。</li></ul><p>导出只在点击时生成，不会随着页面操作持续重算文件。</p><h2 id="完成信号" tabindex="-1">完成信号 <a class="header-anchor" href="#完成信号" aria-label="Permalink to &quot;完成信号&quot;">​</a></h2><div class="task-check">PDF 下载进度完成，Excel 可以打开且包含多个工作表。页面仍保留当前图册，可继续查看。</div><h2 id="出现问题" tabindex="-1">出现问题 <a class="header-anchor" href="#出现问题" aria-label="Permalink to &quot;出现问题&quot;">​</a></h2><div class="task-recovery">导出中断时不要重新导入。保留当前图册，直接再次点击导出。若页面提示输入已改变，先重新生成图册。</div>', 17)
  ])]);
}
const generateExport = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  generateExport as default
};
