/** Community, shop, law database sample, AI models, blog, podcast, plans/promos. */
export const CHAPTERS = [
  ['lawyers-who-code', 'Lawyers Who Code®', '⌨️', 'Snippets, builds and repos — reviewed by peers who also read statutes.', 1240],
  ['lawyers-who-design', 'Lawyers Who Design®', '✏️', 'Legal design portfolios, visual contracts, Tees Projects submissions.', 867],
  ['lawyers-who-analyze-data', 'Lawyers Who Mine & Analyze Data', '📊', 'Legal datasets, scraping ethics, precedent analytics.', 543],
  ['lawyers-who-trade', 'Lawyers Who Trade®', '💼', 'Fintech, tokens and the regulation that moves with markets.', 291]
] as const;

export const POSTS = [
  { chapter: 'lawyers-who-code', author: 'Sara M.', title: 'ip-clause-validator.js', body: 'A tiny validator that checks IP assignment clauses for the three enforceability terms. Feedback on the edge cases welcome.', linkLabel: 'Fork in IDE →', linkKind: 'ide', linkRef: 'javascript-3', votes: 14, comments: ['Handles "hereby assigns" but not "shall assign" — worth a regex?', 'Ported it to Python for the LDA cohort.'] },
  { chapter: 'lawyers-who-design', author: 'Karim H.', title: 'Visual NDA — one-page redesign', body: 'Redesigned a 9-page NDA into a one-page visual contract for the LDT capstone. Figma file attached.', linkLabel: 'Open in Figma ↗', linkKind: 'figma', linkRef: 'https://figma.com', votes: 31, comments: ['The obligations timeline is the best part.', 'Did the counterparty accept the visual version?'] },
  { chapter: 'lawyers-who-analyze-data', author: 'Nour A.', title: 'Cassation merits dataset — 2019–2022 sample', body: 'Clean 4k-row sample from the Bilingual Law Database API, with provenance notes for admissibility.', linkLabel: 'Get the dataset →', linkKind: 'dataset', linkRef: '/law/explorer', votes: 22, comments: ['Provenance column is exactly what the LDA capstone needs.'] },
  { chapter: 'lawyers-who-design', author: 'Lawmads E-Shop', title: 'Tees Project — Vote for the July design', body: 'Twelve designer submissions this month. The winner earns a royalty on every featured T-shirt sold.', linkLabel: 'Vote now →', linkKind: 'vote', linkRef: '/shop', votes: 89, comments: [] }
];

export const SESSIONS = [
  ['LIVE', 'Figma Clinic — LUID cohort', 5, 16, 'Whereby', 'LUID'],
  ['TALK', 'E-Signature validity across GCC', 8, 19, 'Whereby', null],
  ['JAM', 'Code jam: build a clause linter', 10, 18, 'Whereby', 'LWD-FS']
] as const;

export const DESIGNS = [
  ['Delta', 'Mona S.', 2026, true, 412], ['Statute & Stack Trace', 'Omar K.', 2026, false, 233], ['Nomad Contour', 'Lina R.', 2026, false, 198]
] as const;

export const PRODUCTS = [
  ['logo-tee', 'The Logo Tee', 'Classic', 'Basic cotton tee with the Lawmads wordmark. Black or white.', 2500, 'shop_tee_classic', '👕'],
  ['community-tee-delta', 'Community Tee — "Delta"', 'July Drop · Royalty design', "This month's Tees Projects winner. Designer earns a royalty per sale.", 2900, 'shop_tee_community', 'Λ'],
  ['lawyers-who-code-tee', 'Lawyers Who Code® Tee', 'Statement', 'For the chapter that reads statutes and stack traces.', 2900, 'shop_tee_community', '{ law: code }']
] as const;

export const LAW_INSTRUMENTS = [
  { id: 'eg-cc-1948', jurisdiction: 'EG', kind: 'legislation', titleEn: 'Civil Code (Law 131/1948)', titleAr: 'القانون المدني (القانون رقم 131 لسنة 1948)', year: 1948, area: 'Civil', pdf: 'gazette_1948_108.pdf' },
  { id: 'eg-ipl-2002', jurisdiction: 'EG', kind: 'legislation', titleEn: 'Intellectual Property Law (Law 82/2002)', titleAr: 'قانون حماية حقوق الملكية الفكرية (القانون رقم 82 لسنة 2002)', year: 2002, area: 'IP', pdf: 'gazette_2002_22bis.pdf' },
  { id: 'eg-pdpl-2020', jurisdiction: 'EG', kind: 'legislation', titleEn: 'Personal Data Protection Law (Law 151/2020)', titleAr: 'قانون حماية البيانات الشخصية (القانون رقم 151 لسنة 2020)', year: 2020, area: 'Data protection', pdf: 'gazette_2020_28bis.pdf' },
  { id: 'eg-ecl-2004', jurisdiction: 'EG', kind: 'legislation', titleEn: 'E-Signature Law (Law 15/2004)', titleAr: 'قانون التوقيع الإلكتروني (القانون رقم 15 لسنة 2004)', year: 2004, area: 'E-signature', pdf: 'gazette_2004_17.pdf' },
  { id: 'cassation-4213-86', jurisdiction: 'EG', kind: 'cassation', titleEn: 'Court of Cassation, Appeal 4213/86 JY', titleAr: 'محكمة النقض، الطعن رقم 4213 لسنة 86 ق', year: 2019, area: 'Contract', pdf: 'cassation_2019_4213.pdf' },
  { id: 'cassation-2019-412', jurisdiction: 'EG', kind: 'cassation', titleEn: 'Court of Cassation, Appeal 412/2019', titleAr: 'محكمة النقض، الطعن رقم 412 لسنة 2019', year: 2019, area: 'IP', pdf: 'cassation_2019_412.pdf' },
  { id: 'ae-cc-1985', jurisdiction: 'AE', kind: 'legislation', titleEn: 'Civil Transactions Law (Federal Law 5/1985)', titleAr: 'قانون المعاملات المدنية (القانون الاتحادي رقم 5 لسنة 1985)', year: 1985, area: 'Civil', pdf: 'uae_gazette_1985_158.pdf' },
  { id: 'ae-pdpl-2021', jurisdiction: 'AE', kind: 'legislation', titleEn: 'Personal Data Protection Law (Federal Decree-Law 45/2021)', titleAr: 'قانون حماية البيانات الشخصية (مرسوم بقانون اتحادي رقم 45 لسنة 2021)', year: 2021, area: 'Data protection', pdf: 'uae_gazette_2021_712.pdf' },
  { id: 'gb-cdpa-1988', jurisdiction: 'GB', kind: 'legislation', titleEn: 'Copyright, Designs and Patents Act 1988', titleAr: 'قانون حق المؤلف والتصميمات وبراءات الاختراع لسنة 1988', year: 1988, area: 'IP', pdf: 'ukpga_1988_48.pdf' },
  { id: 'de-bgb', jurisdiction: 'DE', kind: 'legislation', titleEn: 'Bürgerliches Gesetzbuch (BGB)', titleAr: 'القانون المدني الألماني', year: 1896, area: 'Civil', pdf: 'bgb_consolidated.pdf' }
];

export const LAW_ARTICLES = [
  { id: 'eg-cc-1948-art147', instrument: 'eg-cc-1948', article: '147', en: 'The contract makes the law of the parties. It can be revoked or altered only by mutual consent of the parties or for reasons provided for by law.', ar: 'العقد شريعة المتعاقدين، فلا يجوز نقضه ولا تعديله إلا باتفاق الطرفين، أو للأسباب التي يقررها القانون.', from: '1949-10-15', construed: ['cassation-4213-86'], prov: { page: 1204, ocr: 0.991, verified: true } },
  { id: 'eg-cc-1948-art89', instrument: 'eg-cc-1948', article: '89', en: 'A contract is concluded upon the exchange of two concordant expressions of the parties’ common intention, subject to any special provisions required by law for its formation.', ar: 'يتم العقد بمجرد أن يتبادل طرفان التعبير عن إرادتين متطابقتين، مع مراعاة ما يقرره القانون فوق ذلك من أوضاع معينة لانعقاد العقد.', from: '1949-10-15', construed: [], prov: { page: 1196, ocr: 0.987, verified: true } },
  { id: 'eg-cc-1948-art374', instrument: 'eg-cc-1948', article: '374', en: 'An obligation is extinguished by prescription after fifteen years, save in cases specially provided for by law.', ar: 'يتقادم الالتزام بانقضاء خمس عشرة سنة، فيما عدا الحالات التي ورد عنها نص خاص في القانون.', from: '1949-10-15', construed: [], prov: { page: 1240, ocr: 0.982, verified: true } },
  { id: 'eg-ipl-2002-art143', instrument: 'eg-ipl-2002', article: '143', en: 'The author and his universal successor shall enjoy perpetual, imprescriptible and inalienable moral rights over the work.', ar: 'يتمتع المؤلف وخلفه العام على المصنف بحقوق أدبية أبدية غير قابلة للتقادم أو للتنازل عنها.', from: '2002-06-03', construed: ['cassation-2019-412'], prov: { page: 44, ocr: 0.994, verified: true } },
  { id: 'eg-ipl-2002-art149', instrument: 'eg-ipl-2002', article: '149', en: 'The author may transfer to a third party all or some of his economic rights; the transfer shall be in writing and shall specify each right, its scope, purpose, duration and place.', ar: 'للمؤلف أن ينقل إلى الغير كل أو بعض حقوقه المالية، ويشترط لانعقاد التصرف أن يكون مكتوبًا وأن يحدد فيه كل حق محل التصرف مع بيان مداه والغرض منه ومدة الاستغلال ومكانه.', from: '2002-06-03', construed: [], prov: { page: 45, ocr: 0.990, verified: true } },
  { id: 'eg-pdpl-2020-art2', instrument: 'eg-pdpl-2020', article: '2', en: 'Personal data may not be collected, processed, disclosed or made available except with the explicit consent of the data subject or in the cases permitted by law.', ar: 'لا يجوز جمع البيانات الشخصية أو معالجتها أو الإفصاح عنها أو إتاحتها إلا بموافقة صريحة من الشخص المعني بالبيانات أو في الأحوال المصرح بها قانونًا.', from: '2020-10-15', construed: [], prov: { page: 3, ocr: 0.996, verified: true } },
  { id: 'eg-ecl-2004-art14', instrument: 'eg-ecl-2004', article: '14', en: 'An electronic signature shall have the same probative force as a handwritten signature where the conditions prescribed by this law and its executive regulations are met.', ar: 'للتوقيع الإلكتروني، في نطاق المعاملات المدنية والتجارية والإدارية، ذات الحجية المقررة للتوقيعات في أحكام قانون الإثبات، إذا روعي في إنشائه الشروط المنصوص عليها في هذا القانون.', from: '2004-04-22', construed: [], prov: { page: 7, ocr: 0.993, verified: true } },
  { id: 'cassation-4213-86-principle', instrument: 'cassation-4213-86', article: 'Principle', en: 'The court may not, under the guise of interpretation, depart from the clear wording of a contract; the contract is the law of the parties.', ar: 'لا يجوز للمحكمة تحت ستار التفسير أن تنحرف عن عبارات العقد الواضحة؛ فالعقد شريعة المتعاقدين.', from: '2019-03-12', construed: [], prov: { page: 2, ocr: 0.97, verified: true } },
  { id: 'cassation-2019-412-principle', instrument: 'cassation-2019-412', article: 'Principle', en: 'The moral right of the author is inalienable; a clause purporting to waive it is void, without prejudice to the transfer of economic rights.', ar: 'الحق الأدبي للمؤلف لا يقبل التنازل عنه؛ ويقع باطلًا كل شرط يقضي بالنزول عنه، دون إخلال بجواز التصرف في الحقوق المالية.', from: '2019-06-04', construed: [], prov: { page: 3, ocr: 0.968, verified: true } },
  { id: 'ae-cc-1985-art243', instrument: 'ae-cc-1985', article: '243', en: 'A contract must be performed in accordance with its contents and in a manner consistent with the requirements of good faith.', ar: 'يجب تنفيذ العقد طبقًا لما اشتمل عليه وبطريقة تتفق مع ما يوجبه حسن النية.', from: '1986-03-29', construed: [], prov: { page: 88, ocr: 0.985, verified: true } },
  { id: 'ae-pdpl-2021-art4', instrument: 'ae-pdpl-2021', article: '4', en: 'Personal data may not be processed without the consent of the data subject, except in the cases specified in this Decree-Law.', ar: 'لا يجوز معالجة البيانات الشخصية دون موافقة صاحب البيانات، باستثناء الحالات المنصوص عليها في هذا المرسوم بقانون.', from: '2022-01-02', construed: [], prov: { page: 5, ocr: 0.992, verified: true } },
  { id: 'gb-cdpa-1988-s11', instrument: 'gb-cdpa-1988', article: 's.11', en: 'The author of a work is the first owner of any copyright in it, subject to the following provisions. Where a literary, dramatic, musical or artistic work is made by an employee in the course of employment, the employer is the first owner.', ar: 'مؤلف المصنف هو المالك الأول لحق المؤلف فيه، مع مراعاة الأحكام التالية؛ فإذا أُنشئ المصنف بواسطة موظف أثناء عمله، كان صاحب العمل هو المالك الأول.', from: '1989-08-01', construed: [], prov: { page: 12, ocr: 0.998, verified: true } },
  { id: 'de-bgb-307', instrument: 'de-bgb', article: '§ 307', en: 'Provisions in standard business terms are ineffective if, contrary to the requirement of good faith, they unreasonably disadvantage the other party to the contract.', ar: 'تكون الشروط الواردة في الشروط العامة للتعاقد غير نافذة إذا أضرت بالطرف الآخر ضررًا غير معقول خلافًا لمقتضيات حسن النية.', from: '2002-01-01', construed: [], prov: { page: 74, ocr: 0.999, verified: true } }
];

export const AI_MODELS = [
  ['lawmad-draft', 'Lawmad-Draft', 'Drafting · AR / EN / FR', 'Contract, pleading and correspondence drafting inside the Lawyer Work Space — style, clarity and risk suggestions fuelled by Law Tech Labs trusted content.', 'Lawyer Work Space'],
  ['lawmad-precedent', 'Lawmad-Precedent', 'Precedent · per jurisdiction', 'The AI Wizard engine. Judicial-precedent Q&A grounded in the Law Database with mandatory citations. Egypt first; jurisdictions follow the campus map.', 'Lawyer Work Space'],
  ['lawmad-clause', 'Lawmad-Clause', 'Analysis', 'Clause classification, risk flagging and ambiguity detection — the model behind consistency checking and contract review labs.', 'Editor · LTS® labs'],
  ['lawmad-translate', 'Lawmad-Translate', 'Translation', 'Legal-grade AR↔EN and AR↔FR translation with terminology alignment, imperfect-equivalent warnings and jurisdiction-specific guidance.', 'Editor · Database'],
  ['lawmad-tutor', 'Lawmad-Tutor', 'Education', 'The Legal Code Tutor inside the IDE — hints, error explanation and law-aware coding guidance. Instructor-configurable: full help, hints only, or exam mode off.', 'IDE Playground'],
  ['lawmad-analyst', 'Lawmad-Analyst', 'Investigation', 'Intelligence-writing assistant trained on the LOSINT® curriculum’s tradecraft — structures findings into legal-grade briefs with confidence language.', 'LOSINT® labs']
] as const;

export const BLOG = [
  ['why-the-delta-generation-needs-two-credentials', 'Why the Delta Generation needs two credentials, not one', 'trends', 'Single-jurisdiction, single-discipline training is training for a profession that no longer exists.', 'Ahmed El Gendy', 9],
  ['inside-the-bilingual-law-database', 'Inside the Bilingual Law Database: article-level alignment', 'deep-dive', 'Why we align Arabic and English at the provision, not the page — and what that costs.', 'Tarek Abdel-Aziz', 14],
  ['badge-pass-rates-2025-26', 'Badge pass rates, 2025–26, including the ones that make us look bad', 'research', 'Germany at 49%, the UK at 52%. We publish the methodology.', 'Lawmads Examination Board', 11],
  ['ide-launch-18-languages', 'The Lawmads IDE: 18 languages, 57 graded exercises, two agentic tracks', 'platform', 'What shipped, what is graded, and how Tech Credits sync to your transcript.', 'Law Tech Labs', 7],
  ['sra-does-not-endorse-anyone', 'The SRA does not endorse anyone — and why we say so', 'trends', 'On the single biggest regulatory risk in SQE preparation marketing.', 'Ahmed El Gendy', 6],
  ['visual-contracts-that-survive-court', 'Visual contracts that survive a courtroom', 'deep-dive', 'The LDT capstone that turned a 9-page NDA into one page — and the enforceability questions it raised.', 'Karim H.', 12]
] as const;

export const PODCAST_SERIES = ['practice', 'build', 'regulate', 'career'] as const;
export const PODCAST_FEATURED = [
  [48, 'the-lawyer-who-shipped-the-regulators-own-api', 'The lawyer who shipped the regulator’s own API', 'Yasmin Haddad', 'Legal Engineer, DIFC', 'build', 51 * 60 + 4, 'How a DIFC legal engineer built the API her regulator now runs, and the eval that failed the week before launch.'],
  [47, 'what-307-bgb-does-to-your-terms', 'What § 307 BGB does to your terms', 'Dr. Klaus Bauer', 'Jurisdiction Lead · Germany', 'regulate', 44 * 60 + 12, 'Standard terms, unreasonable disadvantage, and why a clause-matching model is dangerous in Germany.'],
  [46, 'cassation-merits-as-training-data', 'Cassation merits as training data', 'Tarek Abdel-Aziz', 'Head of Data', 'build', 39 * 60 + 40, 'Provenance, OCR confidence and the third of the law that is never reported.'],
  [45, 'from-appellate-bar-to-agentic-ai', 'From the appellate bar to agentic AI', 'Nour A.', 'LDS® graduate', 'career', 36 * 60 + 5, 'A data scientist who reads statutes on the supervision file that protects you.']
] as const;

export const PROMOS = [{ code: 'DELTA30', percentOff: 30, maxRedemptions: 500 }];
export const FLAGS = [['ladder.requireCertificates', false], ['ide.aiHintsInExams', false], ['community.membersBaseline', 2941]] as const;
