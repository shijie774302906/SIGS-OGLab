import { _ as _export_sfc, o as openBlock, c as createElementBlock, a2 as createStaticVNode } from "./chunks/framework.ZXCZ9mzl.js";
const _imports_0 = "/help/images/workflow/professional-stratification-method.png";
const __pageData = JSON.parse('{"title":"地层分层","description":"","frontmatter":{},"headers":[],"relativePath":"professional/stratification.md","filePath":"professional/stratification.md","lastUpdated":1785585521000}');
const _sfc_main = { name: "professional/stratification.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<h1 id="地层分层" tabindex="-1">地层分层 <a class="header-anchor" href="#地层分层" aria-label="Permalink to &quot;地层分层&quot;">​</a></h1><figure class="manual-shot"><img src="' + _imports_0 + '" alt="地层分层引导页和地层候选生成方式选择窗口"><figcaption>页面只要求完成当前亮起的一步。先选择候选生成方式，再逐层确认。</figcaption></figure><p>主工作面把 qc、fs、u2 和地层柱放在同一深度轴。边界线贯穿曲线和地层，工程师可以边看边改。</p><h2 id="generate-candidate" tabindex="-1">生成候选 <a class="header-anchor" href="#generate-candidate" aria-label="Permalink to &quot;生成候选 {#generate-candidate}&quot;">​</a></h2><p>在指南中确认依据，选择方法后生成可编辑候选。JTS、Ic 和其他分类证据只提供依据，不会自动成为工程师确认土层。</p><h2 id="review-layer" tabindex="-1">逐层确认 <a class="header-anchor" href="#review-layer" aria-label="Permalink to &quot;逐层确认 {#review-layer}&quot;">​</a></h2><p>点击地层柱或右侧土层列表。查看深度范围、建议大类、判断理由和证据。操作包括：</p><ul><li>采用建议并查看下一层</li><li>修改土类</li><li>与上一层或下一层合并</li><li>从中间拆分</li><li>调整边界</li><li>暂时保留</li></ul><h2 id="simplify" tabindex="-1">简化分层 <a class="header-anchor" href="#simplify" aria-label="Permalink to &quot;简化分层 {#simplify}&quot;">​</a></h2><p>简化模式按相邻工程大类合并。相邻砂性土、混合土或黏性土可以合并，组成名称保留原有细类。严重冲突会保留边界并提示，不会为了达到目标层数强行合并。</p><h2 id="commit" tabindex="-1">生成修订 <a class="header-anchor" href="#commit" aria-label="Permalink to &quot;生成修订 {#commit}&quot;">​</a></h2><p>待确认层可以为 0，复核提示可以保留。最终预览中的生成按钮只有一个。生成后形成参数解译引用的分层修订，仍不代表正式工程采纳。</p><h2 id="完成信号" tabindex="-1">完成信号 <a class="header-anchor" href="#完成信号" aria-label="Permalink to &quot;完成信号&quot;">​</a></h2><div class="task-check">顶部“整层确认”完成，最终预览按钮可用，生成后步骤显示分层修订编号并允许进入参数解译。</div><h2 id="出现问题" tabindex="-1">出现问题 <a class="header-anchor" href="#出现问题" aria-label="Permalink to &quot;出现问题&quot;">​</a></h2><div class="task-recovery">边界拖动时，贯穿 qc、fs、u2 和地层柱的同一条线应同步移动。若不一致，取消本次拖动并重新打开页面，不要生成修订。</div>', 16)
  ])]);
}
const stratification = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  stratification as default
};
