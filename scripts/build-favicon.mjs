// 生成站点 favicon：public/Gemini_Generated_Image_tj06xutj06xutj06.svg
//
// 几何全部来自对同名源图 .jpg 的实测（源图 2048×2048 坐标系），推导方式：
//   1. 按颜色阈值把源图分成深色（头梁/猫头/瞳孔）、橙色（耳罩）、白色（眼白）三类；
//   2. 头梁、耳罩、眼睛是规则形状，直接由逐行扫描的边缘点解析求解
//      —— 头梁与眼睛拟合成圆，耳罩拟合成胶囊（圆角矩形，rx = 宽/2）；
//   3. 猫头轮廓逐行采样后，在底部中心、最宽处、耳尖、谷底、冠顶五个特征点处切分，
//      每段用带切向约束的最小二乘拟合一条三次贝塞尔（迭代重参数化）。
//      四段的最大偏差为 2.0–2.7px，即源图尺度下约 0.13%。
// 重绘结果与源图剪影的逐像素差异为 1.36%，且全部落在轮廓抗锯齿边上。
//
// 修改几何后重新运行：node.exe scripts/build-favicon.mjs
import { Buffer } from 'node:buffer'
import { writeFile } from 'node:fs/promises'

// ---------- 源图 2048 坐标系下的实测几何 ----------
const HEAD = {
	bottom: [1024, 1741],
	widest: [431, 1140],
	tip: [545.5, 663],
	valley: [730, 763],
	crown: [1024, 715],
	// 左半轮廓，自底部逆时针到冠顶；每项为 [c1, c2, end]
	left: [
		[[652, 1741], [431, 1501], [431, 1140]], // 底 → 最宽处
		[[431, 1041.5], [466.4, 728.5], [545.5, 663]], // 最宽处 → 耳尖
		[[620.5, 701.7], [604.4, 740.7], [730, 763]], // 耳尖 → 谷底
		[[852.8, 744.6], [868.3, 715], [1024, 715]], // 谷底 → 冠顶
	],
}
const BAND = { cx: 1024, cy: 1008, r: 709.5, w: 81, endY: 1200 }
const CUP = { x: 171, y: 948, w: 420, h: 486, r: 210 }
const EYE = { cx: 760, cy: 1161, r: 195, pupil: 100 }
const CUP_COLOR = '#ff621f' // 自源图采样
const MIRROR = 2048 // 镜像轴 x → MIRROR - x

// ---------- 构图：把主体缩放到 512 网格 ----------
const MARGIN = 16 // 左右安全边距（主体占画面宽度 93.75%）
const OPTICAL_RISE = 8 // 主体上重下沉，整体上移以求视觉居中

const artX0 = CUP.x // 171
const artX1 = MIRROR - CUP.x // 1877
const artY0 = BAND.cy - BAND.r - BAND.w / 2 // 头梁外沿顶端 = 258
const artY1 = HEAD.bottom[1] // 1741

const s = (512 - 2 * MARGIN) / (artX1 - artX0)
const artH = (artY1 - artY0) * s
const offY = (512 - artH) / 2 - OPTICAL_RISE

const X = x => MARGIN + (x - artX0) * s
const Y = y => offY + (y - artY0) * s
const S = v => v * s
const n = v => +v.toFixed(2)
const P = (x, y) => `${n(X(x))} ${n(Y(y))}`

// ---------- 头梁圆弧 ----------
// 两端塞进耳罩内部（耳罩绘制在头梁之上），因此只画露出的上半圈
const bandDy = BAND.endY - BAND.cy
const bandDx = Math.sqrt(BAND.r ** 2 - bandDy ** 2)
const bandPath = `M${P(BAND.cx - bandDx, BAND.endY)}A${n(S(BAND.r))} ${n(S(BAND.r))} 0 1 1 ${P(BAND.cx + bandDx, BAND.endY)}`

// ---------- 猫头闭合路径 ----------
const mx = x => MIRROR - x
let d = `M${P(...HEAD.bottom)}`
for (const [c1, c2, e] of HEAD.left) d += `C${P(...c1)} ${P(...c2)} ${P(...e)}`
// 右半：把左半各段镜像后逆序拼回，控制点同时交换
for (let i = HEAD.left.length - 1; i >= 0; i--) {
	const [c1, c2] = HEAD.left[i]
	const start = i === 0 ? HEAD.bottom : HEAD.left[i - 1][2] // 该段在左半的起点，镜像后成为终点
	d += `C${P(mx(c2[0]), c2[1])} ${P(mx(c1[0]), c1[1])} ${P(mx(start[0]), start[1])}`
}
d += 'Z'

// ---------- 耳罩 ----------
const cup = x0 => `<rect x="${n(X(x0))}" y="${n(Y(CUP.y))}" width="${n(S(CUP.w))}" height="${n(S(CUP.h))}" rx="${n(S(CUP.r))}"/>`

// ---------- 眼睛 ----------
const circle = (cx, cy, r) => `<circle cx="${n(X(cx))}" cy="${n(Y(cy))}" r="${n(S(r))}"/>`

// 配色不做深色模式适配，只有这一套。
//
// 曾尝试过 prefers-color-scheme 反转（猫头转浅、眼圈转深），结论是不可行：
// 浅色块一旦成为主体就会被读成「一张脸」，两只深色眼睛随之变成「眼窝」，
// 整体呈现骷髅感，语义与「黑猫」完全相反。调整眼睛画法（实心眼、仅留瞳孔）
// 都救不回来，问题出在反转本身。
//
// 代价：深色标签栏下猫头几乎融进背景，靠橙色耳罩与白色眼圈提供辨识度。
const INK = '#17171b'
const PAPER = '#fff'

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="戴耳机的猫">
	<path d="${bandPath}" fill="none" stroke="${INK}" stroke-width="${n(S(BAND.w))}" stroke-linecap="round"/>
	<g fill="${CUP_COLOR}">${cup(CUP.x)}${cup(mx(CUP.x + CUP.w))}</g>
	<path d="${d}" fill="${INK}"/>
	<g fill="${PAPER}">${circle(EYE.cx, EYE.cy, EYE.r)}${circle(mx(EYE.cx), EYE.cy, EYE.r)}</g>
	<g fill="${INK}">${circle(EYE.cx, EYE.cy, EYE.pupil)}${circle(mx(EYE.cx), EYE.cy, EYE.pupil)}</g>
</svg>
`

await writeFile('public/Gemini_Generated_Image_tj06xutj06xutj06.svg', svg)
console.log(svg)
console.log('缩放比', s.toFixed(6), '| 主体高', artH.toFixed(1), '| 上边距', offY.toFixed(1), '| 下边距', (512 - offY - artH).toFixed(1))
console.log('字节数', Buffer.byteLength(svg))
