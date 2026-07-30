# 问题库与更新库

这套机制让已经解决过的问题在下一次修改前自动回流，并让重要历史风险在没有验收证据时无法关闭。

## 文件职责

- `problem-library.json`：问题模式的唯一结构化来源，回答“什么容易再次出错、为什么、如何预防和验证”。
- `update-library.json`：`ProcessNNN` 的机器可读关系索引，回答“哪些更新处理过这个问题”。详细过程仍保存在 `process_logs/ProcessNNN.md`。
- `process_logs/knowledge-reviews/ProcessNNN.json`：当前切片的匹配、处置和验收报告，不是新的产品历史。
- `memory.md`：只保留经过确认的长期原则；问题库中的具体症状和测试关系不重复写入 memory。

## 每个切片的固定流程

1. 在用户确认后建立当前 `plan.md`。
2. 自动查找相似问题：

   ```powershell
   npm.cmd run knowledge:check -- --context plan.md --report process_logs/knowledge-reviews/ProcessNNN.json
   ```

3. 把报告中的 `required_checks` 纳入实现与验收。普通提示可以保留，重要问题必须明确处置。
4. 使用命令记录处置；同一个 `--evidence` 可以重复传入：

   ```powershell
   npm.cmd run knowledge:resolve -- --report process_logs/knowledge-reviews/ProcessNNN.json --id KPB-001 --disposition covered --evidence "tests/e2e/example.spec.ts：passed" --note "结果曲线已做可见断言"
   ```

   如果确实不适用，使用 `--disposition not-applicable` 并给出具体 `--note`。不能用空理由跳过。
5. 关闭前运行：

   ```powershell
   npm.cmd run knowledge:gate -- --context plan.md --report process_logs/knowledge-reviews/ProcessNNN.json
   ```

   下列情况会失败：重要命中仍为 `pending`、缺少证据、计划已经变化、问题库已经变化、报告结构无效或关联断裂。

## 随时查询

不建立切片时也可以直接查询历史问题：

```powershell
npm.cmd run knowledge:query -- --text "地层分层按钮点击没有反应"
```

查询会返回命中的问题、历史更新和必做检查，但不会生成关闭报告。

## 新增问题

只在问题具备复用价值时增加正式条目。一个条目必须包含：

- 唯一 `KPB-NNN` ID、标题、状态和重要程度。
- 一组或多组确定性匹配词；每组内的词必须同时出现。
- 用户可观察的症状、已确认根因和预防规则。
- 可执行的验收检查。
- 双向关联的 `ProcessNNN` 更新和现有测试路径。

相同根因的新表现应更新原条目，不要创建近义重复项。问题已不再适用时改为 `retired`，不要删除历史 ID。

## 新增更新

关闭 `ProcessNNN` 时在 `update-library.json` 增加一条轻量索引，并在关联问题的 `related_updates` 中加入相同 ID。正文、截图、命令和边界继续写入 `process_logs/ProcessNNN.md`。

## 校验与测试

```powershell
npm.cmd run knowledge:validate
npm.cmd run knowledge:test
```

匹配采用可解释的确定性关键词，而不是隐藏的相似度模型。误检可以标记为不适用并说明原因；漏检应补充匹配组和回归测试。
