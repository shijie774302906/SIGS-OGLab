import { _ as _export_sfc, o as openBlock, c as createElementBlock, a2 as createStaticVNode } from "./chunks/framework.ZXCZ9mzl.js";
const __pageData = JSON.parse('{"title":"GoG 6 示例","description":"","frontmatter":{},"headers":[],"relativePath":"start/gog6-case.md","filePath":"start/gog6-case.md","lastUpdated":1785583660000}');
const _sfc_main = { name: "start/gog6-case.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<h1 id="gog-6-示例" tabindex="-1">GoG 6 示例 <a class="header-anchor" href="#gog-6-示例" aria-label="Permalink to &quot;GoG 6 示例&quot;">​</a></h1><p>本手册使用同一个公开来源案例演示两条路径，便于对照界面和操作结果。</p><h2 id="source" tabindex="-1">示例来源 <a class="header-anchor" href="#source" aria-label="Permalink to &quot;示例来源 {#source}&quot;">​</a></h2><ul><li>案例名称：GoG 6 from NGI-UWA 2006</li><li>手册依据：用户提供的静态值工作簿</li><li>工作表：Sheet1</li><li>源文件特点：说明文字在前，数据使用双层表头，包含额外列</li><li>发布边界：手册只发布脱敏截图和衍生结果，不提供原始工作簿下载</li></ul><h2 id="why" tabindex="-1">为什么适合作为示例 <a class="header-anchor" href="#why" aria-label="Permalink to &quot;为什么适合作为示例 {#why}&quot;">​</a></h2><p>工作簿不是标准四列表。系统需要识别真正的数据区域，选择 <code>Depth / qc / fs / u2</code>，排除说明文字和重复列。这可以同时演示普通导入和 AI 整理的差别。</p><p>源表第 11 行的锥尖阻力表头写成了 <code>qt</code>。数据提供者已确认这里实际应为 <code>qc</code>。导入时只把该列映射为 <code>qc</code>，原数值不变；后续需要的 <code>qt</code> 由系统按现有 qc/u2 计算流程得到。</p><h2 id="two-paths" tabindex="-1">两条演示路径 <a class="header-anchor" href="#two-paths" aria-label="Permalink to &quot;两条演示路径 {#two-paths}&quot;">​</a></h2><ol><li><a href="/help/quick/import#gog6">快捷出图：导入数据</a></li><li><a href="/help/professional/import#gog6">专业解译：项目与数据导入</a></li></ol><h2 id="完成信号" tabindex="-1">完成信号 <a class="header-anchor" href="#完成信号" aria-label="Permalink to &quot;完成信号&quot;">​</a></h2><div class="task-check">预览中显示连续深度、qc、fs 和 u2，且说明文字、重复 z 列没有进入测量字段；修正记录注明“qt 表头误写为 qc”，原值未改。</div><h2 id="出现问题" tabindex="-1">出现问题 <a class="header-anchor" href="#出现问题" aria-label="Permalink to &quot;出现问题&quot;">​</a></h2><div class="task-recovery">如果系统把报告标题或单位行当成数据，取消导入并使用 AI 整理，或手动指定 Sheet1、表头第 11 行、数据第 14 至 73 行。</div>', 13)
  ])]);
}
const gog6Case = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  gog6Case as default
};
