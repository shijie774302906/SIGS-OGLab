import { _ as _export_sfc, o as openBlock, c as createElementBlock, a2 as createStaticVNode } from "./chunks/framework.ZXCZ9mzl.js";
const __pageData = JSON.parse('{"title":"隐私与本地存储","description":"","frontmatter":{},"headers":[],"relativePath":"privacy.md","filePath":"privacy.md","lastUpdated":1785585521000}');
const _sfc_main = { name: "privacy.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<h1 id="隐私与本地存储" tabindex="-1">隐私与本地存储 <a class="header-anchor" href="#隐私与本地存储" aria-label="Permalink to &quot;隐私与本地存储&quot;">​</a></h1><h2 id="local-storage" tabindex="-1">默认存储 <a class="header-anchor" href="#local-storage" aria-label="Permalink to &quot;默认存储 {#local-storage}&quot;">​</a></h2><p>项目、点位、导入草稿、分层和参数结果默认保存在当前浏览器的本地数据库。换浏览器、换设备或清除网站数据后不会自动同步。</p><h2 id="engineering-data" tabindex="-1">工程数据 <a class="header-anchor" href="#engineering-data" aria-label="Permalink to &quot;工程数据 {#engineering-data}&quot;">​</a></h2><p>普通导入、检查、分层和本地计算不需要把工程数据上传到 SIGS-OGLab 服务器。反馈表单也不会自动附带项目、点位或测量数据。</p><h2 id="ai-data" tabindex="-1">AI 数据边界 <a class="header-anchor" href="#ai-data" aria-label="Permalink to &quot;AI 数据边界 {#ai-data}&quot;">​</a></h2><p>使用 AI 时，完成任务所需的有限文件样本或当前页面上下文会发送给 DeepSeek。使用公共额度或个人 Key 都会发生模型请求。介意数据外发时不要使用 AI。</p><h2 id="analytics" tabindex="-1">匿名访问统计 <a class="header-anchor" href="#analytics" aria-label="Permalink to &quot;匿名访问统计 {#analytics}&quot;">​</a></h2><p>官网使用一年期匿名浏览器标识统计访问次数和地区汇总，用于了解使用量。该标识不绑定工程数据。SIGS-OGLab 应用不读取或保存原始 IP；托管平台仍可能按其服务规则处理网络请求日志。</p><table tabindex="0"><thead><tr><th>用途</th><th>发送或保存的内容</th><th>接收方</th><th>保存期限或关闭方式</th></tr></thead><tbody><tr><td>访问统计</td><td>匿名浏览器标识、地区汇总</td><td>SIGS-OGLab 使用的统计服务</td><td>浏览器标识最长一年；可通过清除该网站 Cookie 重置</td></tr><tr><td>AI 辅助</td><td>完成任务所需的有限文件样本或页面上下文</td><td>DeepSeek</td><td>不使用 AI 即不发送</td></tr><tr><td>反馈邮件</td><td>你主动填写的反馈、联系方式和主动附加的截图</td><td>FormSubmit 转发至项目邮箱</td><td>不提交反馈即不发送</td></tr></tbody></table><h2 id="clear-local" tabindex="-1">清空本机数据 <a class="header-anchor" href="#clear-local" aria-label="Permalink to &quot;清空本机数据 {#clear-local}&quot;">​</a></h2><p>“清空本机数据”会删除当前浏览器中的项目权威数据库和相关指针。该操作不可撤销，恢复只能重新导入源文件。</p>', 12)
  ])]);
}
const privacy = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  privacy as default
};
