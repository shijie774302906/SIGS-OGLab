import { _ as _export_sfc, o as openBlock, c as createElementBlock, a2 as createStaticVNode } from "./chunks/framework.ZXCZ9mzl.js";
const __pageData = JSON.parse('{"title":"方法说明","description":"","frontmatter":{},"headers":[],"relativePath":"reference/methods.md","filePath":"reference/methods.md","lastUpdated":1785585521000}');
const _sfc_main = { name: "reference/methods.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return openBlock(), createElementBlock("div", null, [..._cache[0] || (_cache[0] = [
    createStaticVNode('<h1 id="方法说明" tabindex="-1">方法说明 <a class="header-anchor" href="#方法说明" aria-label="Permalink to &quot;方法说明&quot;">​</a></h1><p>本页只说明软件中方法的用途和显示边界。公式、适用范围和参数以导出文件中的实际方法页为准。</p><h2 id="sbt-ic" tabindex="-1">SBT 与 Ic <a class="header-anchor" href="#sbt-ic" aria-label="Permalink to &quot;SBT 与 Ic {#sbt-ic}&quot;">​</a></h2><p>土体行为类型（Soil Behaviour Type，SBT）依据 CPT/CPTU 指标给出行为分类证据。土体行为类型指数（Soil Behaviour Type Index，Ic）用于连续深度显示和候选分层，不等于工程师确认土层。</p><h2 id="jts" tabindex="-1">JTS 分类 <a class="header-anchor" href="#jts" aria-label="Permalink to &quot;JTS 分类 {#jts}&quot;">​</a></h2><p>JTS/T 242-2020 路径以 qc、fs 和可用的 u2 为输入，按已确认的探头参数计算 qt，并生成九类行为候选证据。缺少 u2 时只运行明确标记的 CPT 近似路线。结果不是概率，也不是正式工程土层。</p><h2 id="bq" tabindex="-1">Bq 与孔压方法 <a class="header-anchor" href="#bq" aria-label="Permalink to &quot;Bq 与孔压方法 {#bq}&quot;">​</a></h2><p>归一化孔压参数（Normalized Pore Pressure Parameter，Bq）需要可用 u2、压力基准、水深和相关修正。选择“只展示原始 u2”时不生成 Bq 和依赖孔压的方法。</p><h2 id="schneider" tabindex="-1">Schneider 2008 <a class="header-anchor" href="#schneider" aria-label="Permalink to &quot;Schneider 2008 {#schneider}&quot;">​</a></h2><p>Schneider 2008 分类用于孔压响应相关证据。只有满足孔压路线时才生成，不会用缺失或未确认的 u2 代替。</p><h2 id="robertson-2016" tabindex="-1">Modified Robertson 2016 <a class="header-anchor" href="#robertson-2016" aria-label="Permalink to &quot;Modified Robertson 2016 {#robertson-2016}&quot;">​</a></h2><p>Modified Robertson 2016 分类提供另一组归一化分类视图。它与 JTS、Ic 和工程师分层并列展示，不自动成为最终工程土层。</p><h2 id="parameters" tabindex="-1">参数相关式 <a class="header-anchor" href="#parameters" aria-label="Permalink to &quot;参数相关式 {#parameters}&quot;">​</a></h2><p>参数页面只计算用户选择的方法。适用性按工程师确认的最终土层大类判断。导出方法页记录实际公式、系数、单位、来源、输入和忽略范围。</p>', 14)
  ])]);
}
const methods = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  methods as default
};
