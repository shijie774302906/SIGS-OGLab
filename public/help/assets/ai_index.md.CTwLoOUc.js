import { _ as _export_sfc, o as openBlock, c as createElementBlock, a2 as createStaticVNode } from "./chunks/framework.ZXCZ9mzl.js";
const __pageData = JSON.parse('{"title":"AI 助手","description":"","frontmatter":{},"headers":[],"relativePath":"ai/index.md","filePath":"ai/index.md","lastUpdated":1785583660000}');
const _sfc_main = { name: "ai/index.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<h1 id="ai-助手" tabindex="-1">AI 助手 <a class="header-anchor" href="#ai-助手" aria-label="Permalink to &quot;AI 助手&quot;">​</a></h1><p>AI 助手分为三个角色。每个角色拥有不同的读取和修改权限，不能互相替代。</p><h2 id="import-assistant" tabindex="-1">导入整理助手 <a class="header-anchor" href="#import-assistant" aria-label="Permalink to &quot;导入整理助手 {#import-assistant}&quot;">​</a></h2><p>用于专业导入和快捷出图输入页。它读取上传文件的有限结构样本，建议工作表、表头、字段、单位和排除列。它只能生成草稿，用户确认后浏览器才执行导入。</p><h2 id="atlas-reader" tabindex="-1">图册解读助手 <a class="header-anchor" href="#atlas-reader" aria-label="Permalink to &quot;图册解读助手 {#atlas-reader}&quot;">​</a></h2><p>用于快捷图册。它可以按需读取当前页面、图表、方法和有限深度数据，自主决定是否调用读取工具。它只读，不可导入、修改、重算或写入工程数据。</p><h2 id="professional-assistant" tabindex="-1">专业助手 <a class="header-anchor" href="#professional-assistant" aria-label="Permalink to &quot;专业助手 {#professional-assistant}&quot;">​</a></h2><p>专业工作台中的助手只能在当前流程允许的边界内提出建议或生成待确认操作。已生成的修订有明确来源，任何写入都必须由用户确认。</p><h2 id="access" tabindex="-1">公共额度与个人 Key <a class="header-anchor" href="#access" aria-label="Permalink to &quot;公共额度与个人 Key {#access}&quot;">​</a></h2><p>官网提供有限的 DeepSeek Pro 公共额度。公共额度用完后，可以在 AI 入口输入自己的 DeepSeek API Key。个人 Key 只保留在当前会话，不写入项目和普通本地存储。</p><h2 id="privacy" tabindex="-1">原文件和隐私 <a class="header-anchor" href="#privacy" aria-label="Permalink to &quot;原文件和隐私 {#privacy}&quot;">​</a></h2><p>AI 整理不会改写原文件。使用公共 AI 或个人 Key 时，完成任务所需的文件结构样本或页面上下文会发送给模型服务。介意数据外发时不要打开 AI，使用普通导入和本地计算。</p><h2 id="完成信号" tabindex="-1">完成信号 <a class="header-anchor" href="#完成信号" aria-label="Permalink to &quot;完成信号&quot;">​</a></h2><div class="task-check">界面明确显示当前 AI 角色、读取对象和是否只读；写入类任务始终有用户确认步骤。</div><h2 id="出现问题" tabindex="-1">出现问题 <a class="header-anchor" href="#出现问题" aria-label="Permalink to &quot;出现问题&quot;">​</a></h2><div class="task-recovery">服务不可用、额度用完或草稿不可靠时，关闭助手。当前文件和已填内容仍保留，使用手动映射或页面原有操作继续。</div>', 16)
  ])]);
}
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  index as default
};
