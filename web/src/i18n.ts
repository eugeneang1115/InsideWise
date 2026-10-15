import base from './base-copy.json';

export type Lang = 'en' | 'ms' | 'zh';
export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ms', label: 'BM', name: 'Bahasa Malaysia' },
  { code: 'zh', label: '中文', name: '简体中文' },
];

type Triplet = [en: string, ms: string, zh: string];

/**
 * Strings from the design handoff, with prototype-only wording replaced and the
 * strings the production flows need added. Malay and Chinese need native review before launch.
 */
const overrides: Record<string, Triplet> = {
  privacyBody: [
    'Readers see reviews without names. We keep a private link between each review and the account that wrote it so you can edit or delete it, and so we can handle abuse. That link is never shown publicly or to moderators. Employment status is self-declared and not verified. Every new or edited review is moderated before it appears. Moderators do not remove honest criticism just because it is negative. Never include names, contact details, identity numbers, exact dates or details that could identify you or a colleague; small teams and unique events can make someone recognisable. You can report a review, appeal a moderation decision, export your data or delete your account at any time. Maps use OpenStreetMap, which receives map requests from your device, including its IP address.',
    'Pembaca melihat ulasan tanpa nama. Kami menyimpan pautan peribadi antara setiap ulasan dan akaun yang menulisnya supaya anda boleh menyunting atau memadamnya, dan supaya kami boleh menangani penyalahgunaan. Pautan ini tidak sekali-kali dipaparkan kepada umum atau moderator. Status pekerjaan diisytiharkan sendiri dan tidak disahkan. Setiap ulasan baharu atau disunting dimoderasi sebelum dipaparkan. Moderator tidak membuang kritikan jujur hanya kerana ia negatif. Jangan sertakan nama, maklumat hubungan, nombor identiti, tarikh tepat atau butiran yang boleh mengenal pasti anda atau rakan sekerja; pasukan kecil dan peristiwa unik boleh menyebabkan seseorang dikenali. Anda boleh melaporkan ulasan, merayu keputusan moderasi, mengeksport data atau memadam akaun pada bila-bila masa. Peta menggunakan OpenStreetMap, yang menerima permintaan peta daripada peranti anda, termasuk alamat IP.',
    '读者看到的评价不显示姓名。我们会在每条评价与其作者账户之间保留私密关联，以便您编辑或删除评价，并处理滥用行为。该关联绝不会公开，也不会向审核员显示。雇佣关系由用户自行声明，未经核实。所有新评价和修改后的评价在公开前均须审核。审核员不会仅因评价负面而删除真实的批评。请勿包含姓名、联系方式、身份证号、确切日期或可识别您或同事的细节；小团队和特殊事件可能让人被认出。您可随时举报评价、对审核决定申诉、导出数据或删除账户。地图使用 OpenStreetMap，它会收到来自您设备的地图请求，包括 IP 地址。',
  ],
  accountNote: [
    'Only you can see this list. Reviews appear publicly without your name once a moderator approves them.',
    'Hanya anda boleh melihat senarai ini. Ulasan dipaparkan kepada umum tanpa nama anda selepas diluluskan moderator.',
    '只有您能看到此列表。评价经审核通过后会匿名公开。',
  ],
  noMine: ['You have not written any reviews yet.', 'Anda belum menulis sebarang ulasan.', '您还没有写过评价。'],
  prototypeSubmit: [
    'Do not include names, contact details, identity numbers or anything that could identify you or a colleague.',
    'Jangan sertakan nama, maklumat hubungan, nombor identiti atau apa-apa yang boleh mengenal pasti anda atau rakan sekerja.',
    '请勿包含姓名、联系方式、身份证号或任何可识别您或同事的信息。',
  ],
  signin: ['Sign in', 'Log masuk', '登录'],
  demo: [
    'Some companies and reviews are sample data, marked DEMO.',
    'Sebahagian syarikat dan ulasan ialah data contoh, ditanda DEMO.',
    '部分公司和评价为示例数据，标有 DEMO。',
  ],
  fictional: ['Fictional sample company.', 'Syarikat contoh rekaan.', '虚构的示例公司。'],
};

const added: Record<string, Triplet> = {
  register: ['Create account', 'Cipta akaun', '创建账户'],
  haveAccount: ['Already have an account? Sign in', 'Sudah ada akaun? Log masuk', '已有账户？登录'],
  needAccount: ['New here? Create an account', 'Baru di sini? Cipta akaun', '新用户？创建账户'],
  email: ['Email', 'E-mel', '电子邮件'],
  password: ['Password (at least 10 characters)', 'Kata laluan (sekurang-kurangnya 10 aksara)', '密码（至少 10 个字符）'],
  authNote: [
    'Your email is private. It is never shown with your reviews. We do not verify your employer.',
    'E-mel anda dirahsiakan dan tidak dipaparkan bersama ulasan anda. Kami tidak mengesahkan majikan anda.',
    '您的电子邮件保密，绝不会与评价一同显示。我们不会核实您的雇主。',
  ],
  signInToWrite: ['Sign in to write a review.', 'Log masuk untuk menulis ulasan.', '请登录后撰写评价。'],
  signInToSee: ['Sign in to see your reviews.', 'Log masuk untuk melihat ulasan anda.', '登录后查看您的评价。'],
  credentials: ['Email or password is incorrect.', 'E-mel atau kata laluan tidak betul.', '电子邮件或密码不正确。'],
  emailTaken: ['An account with this email already exists.', 'Akaun dengan e-mel ini sudah wujud.', '该电子邮件已注册。'],
  unauthorized: ['Please sign in again.', 'Sila log masuk semula.', '请重新登录。'],
  duplicate: [
    'You have already reviewed this company. Edit your existing review instead.',
    'Anda sudah mengulas syarikat ini. Sunting ulasan sedia ada anda.',
    '您已评价过这家公司，请编辑原有评价。',
  ],
  account: ['Account', 'Akaun', '账户'],
  exportData: ['Download my data', 'Muat turun data saya', '下载我的数据'],
  deleteAccount: ['Delete account', 'Padam akaun', '删除账户'],
  deleteAccountConfirm: [
    'Delete your account and all your reviews permanently? This cannot be undone.',
    'Padam akaun dan semua ulasan anda secara kekal? Tindakan ini tidak boleh dibatalkan.',
    '永久删除您的账户及所有评价？此操作无法撤销。',
  ],
  hidden: ['Hidden after a report', 'Disembunyikan selepas laporan', '因举报被隐藏'],
  moderatorNote: ['Moderator note', 'Nota moderator', '审核备注'],
  appealMessage: ['Why should this decision change? (at least 10 characters)', 'Mengapa keputusan ini patut diubah? (sekurang-kurangnya 10 aksara)', '为什么应更改此决定？（至少 10 个字符）'],
  appealSent: ['Appeal sent. A moderator will look at it.', 'Rayuan dihantar. Moderator akan menelitinya.', '申诉已提交，审核员将进行处理。'],
  reportSent: ['Thanks. A moderator will look at this review.', 'Terima kasih. Moderator akan meneliti ulasan ini.', '谢谢，审核员将查看这条评价。'],
  deleted: ['Deleted.', 'Dipadam.', '已删除。'],
  pendingReviews: ['Waiting for review', 'Menunggu semakan', '待审核'],
  openReports: ['Open reports', 'Laporan terbuka', '待处理举报'],
  openAppeals: ['Appeals', 'Rayuan', '申诉'],
  noteOptional: ['Note to the author (optional)', 'Nota kepada penulis (pilihan)', '给作者的备注（可选）'],
  accept: ['Accept and publish', 'Terima dan terbitkan', '接受并发布'],
  decline: ['Keep decision', 'Kekalkan keputusan', '维持原决定'],
  moderationRules: [
    'Publish honest experiences, including negative ones. Ask for changes or reject only for identifying details, harassment, discrimination, unverifiable criminal accusations or off-topic content.',
    'Terbitkan pengalaman jujur, termasuk yang negatif. Minta perubahan atau tolak hanya kerana butiran pengenalan, gangguan, diskriminasi, tuduhan jenayah yang tidak dapat disahkan atau kandungan luar topik.',
    '发布真实经历，包括负面经历。仅在包含身份信息、骚扰、歧视、无法核实的犯罪指控或离题内容时才要求修改或拒绝。',
  ],
  page: ['Page', 'Halaman', '页'],
  previous: ['Previous', 'Sebelumnya', '上一页'],
  next: ['Next', 'Seterusnya', '下一页'],
  retry: ['Try again', 'Cuba lagi', '重试'],
  noReviewsCompany: ['No published reviews yet. Be the first to share a workplace experience.', 'Belum ada ulasan diterbitkan. Jadilah yang pertama berkongsi pengalaman.', '暂无已发布的评价。成为第一个分享职场经历的人。'],
  previewBanner: [
    'Preview with sample data. Any email and a 10-character password work, every account can moderate, and nothing is saved after you reload.',
    'Pratonton dengan data contoh. Sebarang e-mel dan kata laluan 10 aksara boleh digunakan, setiap akaun boleh memoderasi, dan tiada apa disimpan selepas dimuat semula.',
    '使用示例数据的预览。任何电子邮件和 10 个字符的密码均可使用，每个账户都可以审核，刷新后不会保留任何内容。',
  ],
  reviewsHeading: ['Reviews', 'Ulasan', '评价'],
  offices: ['Offices', 'Pejabat', '办公地点'],
  reviewedAt: ['Published', 'Diterbitkan', '发布于'],
  ratingsBreakdown: ['Ratings breakdown', 'Pecahan penilaian', '评分明细'],
  charCount: ['characters', 'aksara', '字符'],
  draftKept: ['Your unsent draft is kept on this device.', 'Draf yang belum dihantar disimpan pada peranti ini.', '未提交的草稿保存在此设备上。'],
  reviewFor: ['Company', 'Syarikat', '公司'],
  choose: ['Choose…', 'Pilih…', '请选择…'],
  smallTeam: [
    'Small teams and unique events can make you recognisable. Keep details general.',
    'Pasukan kecil dan peristiwa unik boleh menyebabkan anda dikenali. Kekalkan butiran secara umum.',
    '小团队和特殊事件可能让您被认出，请尽量概括描述。',
  ],
};

const copy: Record<string, Triplet> = { ...(base as unknown as Record<string, Triplet>), ...overrides, ...added };
const index: Record<Lang, number> = { en: 0, ms: 1, zh: 2 };

export function translator(lang: Lang) {
  return (key: string): string => copy[key]?.[index[lang]] ?? key;
}

/** Industry keys whose label, in any language, contains the query. Lets "金融" find Finance. */
export function industriesMatching(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ['Technology', 'Creative', 'Finance', 'Consumer'].filter((k) => copy[k].some((label) => label.toLowerCase().includes(q)));
}

export const INDUSTRIES = ['Technology', 'Creative', 'Finance', 'Consumer'] as const;
export const METRICS = ['overall', 'pay', 'management', 'culture', 'growth', 'balance'] as const;
