import { _ as _export_sfc, o as openBlock, c as createElementBlock, a2 as createStaticVNode } from "./chunks/framework.ZXCZ9mzl.js";
const _imports_0 = "/help/images/workflow/professional-check-location.png";
const __pageData = JSON.parse('{"title":"专业解译：数据检查","description":"","frontmatter":{},"headers":[],"relativePath":"professional/check.md","filePath":"professional/check.md","lastUpdated":1785583660000}');
const _sfc_main = { name: "professional/check.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<h1 id="专业解译-数据检查" tabindex="-1">专业解译：数据检查 <a class="header-anchor" href="#专业解译-数据检查" aria-label="Permalink to &quot;专业解译：数据检查&quot;">​</a></h1><figure class="manual-shot"><img src="' + _imports_0 + '" alt="数据检查页，中央显示完成信号、提示队列和测量曲线，右侧显示当前检查项"><figcaption>先看顶部完成信号，再在曲线上核对提示；存在提示不等于必须中止。</figcaption></figure><p>数据检查只把当前最需要处理的一项放在前面，同时显示 qc、fs、u2 整孔曲线，帮助判断是孤立点还是连续区间。</p><h2 id="current-problem" tabindex="-1">处理当前问题 <a class="header-anchor" href="#current-problem" aria-label="Permalink to &quot;处理当前问题 {#current-problem}&quot;">​</a></h2><p>查看问题深度、原始行、三条曲线和影响。选择一个固定操作：</p><ul><li>不使用此行并复检</li><li>删除当前工作数据中的这一点</li><li>手动调整衍生或可编辑值</li><li>保留并接受提示</li></ul><p>删除只影响当前工作和下游输入，不会擦除上传证据。重新导入可以恢复。</p><h2 id="batch" tabindex="-1">同类问题批量处理 <a class="header-anchor" href="#batch" aria-label="Permalink to &quot;同类问题批量处理 {#batch}&quot;">​</a></h2><p>只有相同原因、稀疏且影响范围明确时，才使用“一键全部忽略”或“一键全部删除”。执行前检查数量、深度范围和影响比例。</p><h2 id="完成信号" tabindex="-1">完成信号 <a class="header-anchor" href="#完成信号" aria-label="Permalink to &quot;完成信号&quot;">​</a></h2><div class="task-check">顶部显示“检查完成，可进入地层分层”。提示可以保留，真正的问题必须处理后才能继续。</div><h2 id="出现问题" tabindex="-1">出现问题 <a class="header-anchor" href="#出现问题" aria-label="Permalink to &quot;出现问题&quot;">​</a></h2><div class="task-recovery">不确定是否删除时，先保留提示。若后续某个方法无法计算，可在参数页面对该方法的无效点选择忽略，不必重做整条工作流。</div>', 13)
  ])]);
}
const check = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  check as default
};
