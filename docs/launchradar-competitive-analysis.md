# LaunchRadar 竞品分析报告

**日期**: 2026年3月21日  
**结论**: 市场规模过小，竞品均未能做大，项目暂停

---

## 背景

LaunchRadar 的初始定位：帮助 indie hacker 监控 Reddit 和 HN 上的高意图帖子，通过 AI 评分找到潜在客户，$19/月订阅。

核心假设：有足够多的 indie hacker 愿意为"AI 过滤版 Reddit 监控"付费。

---

## 市场概览

这个市场的核心需求是：**帮助创业者在 Reddit/HN 上找到正在寻找解决方案的潜在客户。**

工具进化路径：
1. 手动搜索 Reddit（免费但耗时）
2. 关键词提醒工具（F5Bot、Syften）
3. AI 意图评分工具（GummySearch、LaunchRadar 方向）
4. 全自动外联工具（ReplyAgent、Leado）

---

## 竞品逐一分析

---

### 1. F5Bot（f5bot.com）

**创始人**: Lewis Van Winkle，美国，个人项目  
**成立时间**: 2017年  
**定价**: 完全免费  
**商业模式**: 广告 + 捐款 + 付费升级（新增）  
**融资**: $0

**产品功能**:
- 输入关键词，有人在 Reddit/HN/Lobsters 提到就发邮件提醒
- 纯关键词匹配，无 AI 过滤
- 无 dashboard，只有邮件
- 每个关键词每天上限50条提醒，超过自动禁用

**流量数据（SimilarWeb，2026年2月）**:
- 月访问量：57,277
- 环比增长：+6.65%
- Pages/Visit：4.32
- Bounce Rate：34.59%
- Visit Duration：58秒
- Global Rank：#413,259

**收入**: 接近 $0（2018年 Patreon 只赚了 $41）

**官网**: https://f5bot.com  
**Product Hunt**: https://www.producthunt.com/products/f5bot/reviews  
**SaaSHub 评价**: https://www.saashub.com/f5bot-reviews

**用户评价**:
- "Amazing at notifying for specific keywords. The only downside is that it doesn't have context around your keywords."
- "I've been using F5Bot for SaaSHub for quite some time now. It is super simple and remarkably fast."
- 每天发出 175,000+ 封提醒邮件（官网数据）

**核心问题**:
- 噪音极大，用户反映 "hundreds of notifications, but rarely acting on them"
- 热门关键词触发上限，错过重要提醒
- 无 AI 过滤，"I hate [Product]" 和 "I love [Product]" 一视同仁
- 创始人已多年没有认真运营，LinkedIn 上被称为 "the Yahoo of social listening"

**结论**: 每天17.5万封邮件证明需求真实存在，但免费定位 + 噪音问题使其无法商业化。访问量57K看似不小，但用户注册完就走，不是真正活跃用户。

---

### 2. GummySearch（gummysearch.com）——已关闭

**创始人**: Fed（@foliofed），加拿大  
**成立时间**: 2021年  
**关闭时间**: 2025年11月30日  
**定价**: $29–$199/月，$10 day pass，支持 LTD  
**融资**: $0（完全 bootstrap）

**产品功能**:
- Reddit 社区深度分析
- 关键词监控 + 提醒
- 痛点发现、竞品分析
- 受众研究（pain points、solution requests）
- **无 AI intent scoring**（这是 GummySearch 与新一代工具的核心区别）

**流量数据（SimilarWeb，2024年8月）**:
- 月访问量：118,300
- Bounce Rate：27.36%
- Pages/Visit：14.25
- Visit Duration：7分37秒

**商业数据**:
- 峰值 MRR：**$35,000**（关闭时）
- 累计收入：**$100K+**
- 注册用户：**135,000+**
- 付费用户：**10,000**
- 早期 LTD 促销：2个月带来 $50K 收入

**关闭原因**: Reddit 2023年修改 API 定价政策，要求商业应用付费获得授权（约 $0.24/1000次调用）。GummySearch 谈判两年未果，2025年11月宣布关闭。

**官方关闭声明**: https://gummysearch.com/final-chapter/  
**创始人 IH 访谈**: https://www.indiehackers.com/post/bootstrap-saas-to-100k-audience-research-tool-for-reddit-b1a07a4897  
**Trustpilot 评价**: https://www.trustpilot.com/review/gummysearch.com  
**Capterra 评价**: https://www.capterra.com/p/251952/GummySearch/  
**Startup Obituary**: https://startupobituary.com/p/gummysearch

**用户评价**:
- "I'd pay for GummySearch a thousand times over"
- "Gummy Search has become my market research weapon of choice"
- "The coolest onboarding I've seen in a while, maybe ever"
- "You would be a fool to pass up on this"

**关闭后用户去向**: 分散，没有一个替代品成功承接，市场碎片化。

**核心教训**:
1. **平台风险是致命的**：建在别人 API 上的产品，平台随时可以改规则
2. **$35K MRR 证明需求真实**：但 135,000 用户中只有 10,000 付费，转化率约 7%
3. **关闭是有序退出**：给了用户一年时间迁移，口碑良好

---

### 3. Syften（syften.com）

**创始人**: Michal Mazurek，波兰 Krakow，solo founder  
**成立时间**: 2019年  
**定价**: $19.95–$99.95/月（基础版不含 Twitter）  
**融资**: $0

**产品功能**:
- 监控 Reddit、HN、Twitter/X、Bluesky、Mastodon、Indie Hackers、Stack Overflow、YouTube、GitHub、Dev.to 等15+平台
- 关键词 + Boolean 语法过滤
- 近实时提醒（1分钟内）
- Slack 集成、RSS、API、Webhooks
- **高级套餐有 AI 过滤**，但不是 intent scoring

**流量数据（SimilarWeb，2026年2月）**:
- 月访问量：**13,919**
- 环比增长：+30.6%
- Pages/Visit：1.50
- Visit Duration：20秒
- Bounce Rate：41.38%
- Global Rank：#1,756,904

**商业数据**:
- MRR（2022年）：**€6,000**
- 创始人在 HN 表示："I'm able to support myself from my online business now, but it took three years of learning and struggle"

**来源**:
- IH 访谈: https://www.indiehackers.com/post/syften-building-a-social-monitoring-tool-with-michal-mazurek-f0e12ec90b
- 收入数据: https://onepersonbusiness.substack.com/p/one-person-business-syften
- Capterra 评价: https://www.capterra.com/p/240533/Syften/reviews/
- G2 评价: https://www.g2.com/products/syften/reviews

**用户评价**:
- "probably the only vendor I actively recommend to people without them asking"
- "feels like he's a part of our development team"
- "set it up and forget about it"
- 缺点：需要自己写 Boolean 语法，技术门槛高；无 AI intent scoring

**核心问题**:
- 流量14K，Visit Duration 只有20秒，用户粘性极低
- 6年只做到 €6K MRR，增长极慢
- 需要用户懂技术语法，普通 indie hacker 上手困难（亲测：界面像写代码）
- 定位是"通用监控工具"，不专注 customer acquisition

---

### 4. CatchIntent（catchintent.com）

**创始人**: Akash Rajpurohit，印度  
**成立时间**: 2025年（新产品）  
**定价**: 未公开，需预约电话，估计 $99–199/月  
**目标客户**: B2B SaaS 公司、销售团队

**产品功能**:
- 监控 Reddit、Twitter/X、HN、Bluesky
- AI 识别真实购买意图（Mention vs Signal）
- 号称减少 95% 噪音
- 近期新增 LinkedIn 潜客搜索功能

**流量数据（SimilarWeb，2026年2月）**:
- 月访问量：**1,288**
- 环比增长：+240.49%（基数极小）
- Global Rank：#11,999,211
- 主要流量来源：**印度**

**官网**: https://catchintent.com  
**定价页**: https://catchintent.com/pricing/

**核心问题**:
- 流量极小，几乎不存在
- 定价高端，面向有预算的团队，不适合 indie hacker
- 主要流量来自印度，目标市场定位混乱
- 增长 240% 看起来很高，但从 300 到 1,288 没有实质意义

---

### 5. Leado.co（leado.co）

**成立时间**: 2025年12月（刚发布）  
**定价**: 未公开  
**来源地**: 美国（San Francisco）

**产品功能**:
- Reddit 24/7 监控 + AI 意图检测
- **自动生成回复**（这是高风险功能）
- Opportunity Score (0-100)
- Viral post templates
- 支持 Slack、Email、Discord、Webhook 提醒

**流量数据（SimilarWeb，2026年2月）**:
- 月访问量：**3,971**
- 环比增长：+134.16%
- Pages/Visit：1.23
- Mobile：86.99%
- Global Rank：#4,679,164

**新闻来源**: https://www.einpresswire.com/article/872607734/leado-launches-ai-reddit-agent-that-finds-high-intent-leads-for-businesses

**核心问题**:
- "新闻"是自己花钱在 EINPresswire 发的付费新闻稿，不是真正媒体报道
- 流量极小，87% 来自手机，Pages/Visit 只有 1.23，几乎全是跳出
- 自动生成回复功能有 Reddit 封号风险
- 用户 testimonials 语气可疑，不像真实 indie hacker

---

### 6. Reppit AI（reppit.ai）

**成立时间**: 2025年（新产品）  
**定价**: $29/月（或 $25/月年付）  
**来源地**: 法国

**产品功能**:
- Reddit 监控 + AI intent scoring (0-100)
- 自动发现相关 subreddit 和关键词（只需输入网址）
- 每日 prospect feed，按分数排序
- AI 起草回复建议，用户自己去 Reddit 回复
- 追踪已回复/已跳过的帖子

**流量数据（SimilarWeb，2026年2月）**:
- 月访问量：**1,467**
- 环比变化：**-3.56%（下跌）**
- Global Rank：#11,144,635
- 主要流量来源：**法国**

**来源**:
- 官网: https://reppit.ai
- GummySearch 替代比较: https://reppit.ai/alternative/gummysearch-alternative

**核心问题**:
- 流量极小且在下跌
- 主要流量来自法国，不是目标市场（英语 indie hacker）
- 产品功能和 LaunchRadar 高度重合，但没有做起来
- 内容营销策略（大量竞品比较文章）是对的，但还没产生效果

---

### 7. Octolens（octolens.com）——本批竞品中唯一真正活着的

**创始人**: （Berlin, Germany），两人团队（创始人 + 工程师 Pepe）  
**成立时间**: 约 2023年  
**定价**: $49–$149/月（Pro），有 Enterprise 定制方案  
**融资**: $0（bootstrap）  
**目标客户**: B2B SaaS 公司、开发者工具公司

**产品功能**:
- 监控 13+ 平台：Reddit、X/Twitter、LinkedIn、GitHub、YouTube、HN、Bluesky、Stack Overflow、newsletters、podcasts 等
- AI 相关性评分
- Slack/Email/Webhook 实时提醒
- REST API、MCP server、CSV 导出
- 支持团队协作

**流量数据**: 需自查 https://www.similarweb.com/website/octolens.com/

**商业数据**:
- 2024年10月 MRR 环比增长 20%
- AppSumo 活动：60天卖出 $200K，1000+ 新用户
- 客户包括：Vercel、Prisma、PostHog、Tally、Supabase

**来源**:
- AppSumo 案例: https://octolens.com/blog/200k-in-60-days-honest-review-of-appsumo-select-for-my-ai-b2b-saas-product-2024
- MRR 增长: https://rivalsense.co/intel/octolens/
- G2 评价: https://www.g2.com/products/crowdlens-octolens/reviews

**用户评价**:
- "I've tried others like Octolens, Syften, and F5bot. Octolens is my favorite"
- "The Octolens team built one of the most impactful products I've used in the last 10 years" （Vercel 用户）
- "It fundamentally changed how we run every product team at Vercel"

**核心优势**:
- 唯一真正在增长的竞品
- B2B SaaS 定位，客户有预算
- 覆盖平台最广（13+）
- 有真实的大客户背书

**为什么 LaunchRadar 无法竞争**:
- Octolens 走的是高端 B2B 路线（$49–149/月），需要销售、客户成功、人脉积累
- 他们的客户是有品牌需要保护的成熟公司，不是找第一批用户的 indie hacker
- 创始人在 B2B SaaS 圈子里有多年积累

---

## 竞品流量汇总对比

| 工具 | 月流量 | MRR | 状态 | 目标用户 |
|------|--------|-----|------|----------|
| GummySearch | 118,300 | $35K（峰值） | **已关闭** | Indie hacker |
| F5Bot | 57,277 | ~$0 | 半死不活 | 所有人 |
| Syften | 13,919 | ~€6K（2022） | 活着但小 | 小型 SaaS 团队 |
| Octolens | 待查 | 增长中 | **唯一健康** | B2B SaaS 公司 |
| Leado.co | 3,971 | 未知 | 刚起步 | 不明确 |
| CatchIntent | 1,288 | 未知 | 几乎不存在 | B2B 销售团队 |
| Reppit AI | 1,467 | 未知 | 在下跌 | Indie hacker |

---

## 市场规模判断

**需求是真实的**，但市场规模可能比想象的小得多：

- GummySearch 4年时间，135,000 注册用户，只有 10,000 付费用户
- $35K MRR 是这个市场的天花板估算（单产品、reddit-focused）
- 大多数 indie hacker 更倾向于免费工具（F5Bot）而非付费工具

**为什么这个市场难做大**：

1. **付费意愿有限**：Indie hacker 本身就是省钱的群体，工具费用敏感
2. **需求频率低**：找第一批用户是一次性需求，不是持续需求，续费率可能极低
3. **竞品获客成本高**：没有人找到可复制的增长飞轮，所有工具都依赖创始人手动推广
4. **平台风险**：Reddit API 政策随时可变（已经干掉了 GummySearch）
5. **替代方案多**：F5Bot 免费可用，手动搜索也可以，付费门槛高

---

## Reddit API 风险评估

**LaunchRadar 使用的是 Reddit 公开 .json 接口**（非官方商业 API），规避了 GummySearch 的问题：

- `reddit.com/r/subreddit/new.json` 是 Reddit 自己网站内部接口
- 不需要商业授权
- 关掉它等于 Reddit 自己的网站也坏了

但风险仍然存在：
- Reddit 可以随时改变公开接口的访问策略
- 如果产品做大，Reddit 可能要求付费授权
- 官方商业 API 费率约 $0.24/1000 次调用

短期内（MVP阶段）风险可控，长期需要申请官方授权。

---

## 竞品 Demo 调查结论

所有竞品**均没有找到清晰的 demo 视频或产品演示**，包括：
- F5Bot：无 demo
- Syften：界面复杂，需自己摸索（亲测：像写代码的搜索语法）
- GummySearch：已关闭
- CatchIntent/Leado/Reppit：无 demo 视频

这说明这个市场的产品普遍缺乏好的 onboarding 和 demo，也说明各产品都处于早期阶段，没有找到 product-market fit。

---

## 最终结论

**LaunchRadar 不是一个值得继续投入的方向，原因如下：**

1. **没有可以山寨的成功产品**：唯一成功的 GummySearch 已关闭，唯一健康的 Octolens 走 B2B 高端路线，都不适合快速山寨

2. **所有 C 端竞品流量都极小**：Syften 14K、CatchIntent 1.3K、Reppit 1.5K、Leado 4K，没有一个做起来，说明 C 端 indie hacker 市场要么太小，要么获客成本太高

3. **市场天花板低**：GummySearch 4年做到 $35K MRR 是最好的结果，对于需要认真运营的产品来说性价比不高

4. **需要大量社区运营**：这个市场的获客本质上是"创始人本人去 Reddit 手动种草"，不是产品自然增长，不适合快速 vibe coding 模式

5. **B 端不适合**：Octolens 走 B2B 路线成功，但需要销售人脉和行业积累，不是短期可复制的

**项目状态：暂停，Vercel 冷藏。**

---

## 附：如果未来重新考虑此方向

如果未来回到这个方向，建议：

1. **先找10个愿意付钱的用户再写代码**，验证付费意愿
2. **专注一个极窄的垂直市场**（如专门服务 SaaS founders），而非所有 indie hacker
3. **创始人本人深度参与社区**，在 r/SideProject、Indie Hackers 上建立信任
4. **学习 GummySearch 的定价策略**：$1 试用、$10 day pass、LTD 降低付费门槛
5. **考虑申请 Reddit 官方 API**，避免平台风险

---

*报告生成日期：2026年3月21日*
