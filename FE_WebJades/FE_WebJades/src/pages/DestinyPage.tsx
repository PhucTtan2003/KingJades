import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { Link, useLocation } from "react-router-dom";

import Header from "../components/Header";

import Footer from "../components/Footer";

import { contactApi } from "../api/contactapi";



import "../styles/DestinyPage.css";



type ElementKey =

  | "Wood"

  | "Fire"

  | "Earth"

  | "Metal"

  | "Water";



type Stem = {

  vi: string;

  en: string;

  element: ElementKey;

  polarity: "Yang" | "Yin";

};



type Branch = {

  vi: string;

  en: string;

  emoji: string;

  element: ElementKey;

};



type ElementInfo = {

  key: ElementKey;

  vi: string;

  emoji: string;

  color: string;

  description: string;

  insight: string;

};



type JadeRecommendation = {

  name: string;

  shortName: string;

  bovis: number;

  grade: string;

  description: string;

};



type FormState = {

  fullName: string;

  birthDate: string;

  birthTime: string;

  gender: "any" | "male" | "female";

};



type HomeDestinyNavigationState = {

  fromHomeDestiny?: boolean;

  autoCalculate?: boolean;

  phoneCountryCode?: string;

  phone?: string;

  destinyForm?: Partial<FormState>;

};



type DestinyFeedbackSlide = {

  id: string;

  name: string;

  rating: number;

  text: string;

  createdAt: string;

};



const DESTINY_FEEDBACK_STORAGE_KEY =

  "kingjades_destiny_feedback_slider_v1";



const MAX_DESTINY_FEEDBACKS = 30;



const loadStoredDestinyFeedbacks = (): DestinyFeedbackSlide[] => {

  if (typeof window === "undefined") {

    return [];

  }



  try {

    const raw = window.localStorage.getItem(

      DESTINY_FEEDBACK_STORAGE_KEY

    );



    if (!raw) {

      return [];

    }



    const parsed = JSON.parse(raw);



    if (!Array.isArray(parsed)) {

      return [];

    }



    return parsed

      .filter(

        (item) =>

          item &&

          typeof item.text === "string" &&

          typeof item.rating === "number"

      )

      .slice(0, MAX_DESTINY_FEEDBACKS);

  } catch {

    return [];

  }

};



const saveStoredDestinyFeedbacks = (

  items: DestinyFeedbackSlide[]

) => {

  if (typeof window === "undefined") {

    return;

  }



  try {

    window.localStorage.setItem(

      DESTINY_FEEDBACK_STORAGE_KEY,

      JSON.stringify(

        items.slice(0, MAX_DESTINY_FEEDBACKS)

      )

    );

  } catch {

    // Demo frontend-only: nếu trình duyệt chặn localStorage,

    // feedback vẫn hiển thị trong phiên hiện tại.

  }

};



type PillarRow = {

  label: string;

  stem: Stem;

  branch: Branch;

  note: string;

};



type DestinyResult = {

  fullName: string;

  birthDate: string;

  gender: FormState["gender"];

  year: number;

  month: number;

  day: number;

  hourIdx: number;

  trueSolarHour: number | null;

  pillars: PillarRow[];

  counts: Record<ElementKey, number>;

  combined: Record<ElementKey, number>;

  mainElement: ElementKey;

  missingElements: ElementKey[];

  dayMasterElement: ElementKey;

  dayMasterStem: Stem;

  dayMasterStrong: boolean;

  dayMasterScore: number;

  yongShenElement: ElementKey;

};



const ZALO_URL = "https://zalo.me/0918229999";



const PHONE_COUNTRY_OPTIONS = [

  { code: "+84", label: "VN +84" },

  { code: "+1", label: "US/CA +1" },

  { code: "+44", label: "UK +44" },

  { code: "+61", label: "AU +61" },

  { code: "+81", label: "JP +81" },

  { code: "+82", label: "KR +82" },

  { code: "+65", label: "SG +65" },

  { code: "+66", label: "TH +66" },

  { code: "+86", label: "CN +86" },

  { code: "+852", label: "HK +852" },

  { code: "+886", label: "TW +886" },

  { code: "+49", label: "DE +49" },

  { code: "+33", label: "FR +33" },

];



const normalizeVietnamPhoneInput = (value: string) => {

  const text = value.trim();

  let digits = text.replace(/\D/g, "");

  if (text.startsWith("+") && digits.startsWith("84")) {

    digits = digits.slice(2);

  } else if (text.startsWith("00") && digits.startsWith("0084")) {

    digits = digits.slice(4);

  }

  return digits.replace(/^0+/, "").slice(0, 9);

};



const ELEMENT_ORDER: ElementKey[] = [

  "Wood",

  "Fire",

  "Earth",

  "Metal",

  "Water",

];



const ELEMENTS: Record<ElementKey, ElementInfo> = {

  Wood: {

    key: "Wood",

    vi: "Mộc",

    emoji: "木",

    color: "#5a9a3a",

    description:

      "Tăng trưởng, sáng tạo, linh hoạt và khả năng mở rộng.",

    insight:

      "Năng động, sáng tạo. Tăng cường bằng ngọc Thủy; cân bằng bằng hành Kim.",

  },

  Fire: {

    key: "Fire",

    vi: "Hỏa",

    emoji: "火",

    color: "#d45a20",

    description:

      "Nhiệt huyết, hành động, biểu đạt và sức sống.",

    insight:

      "Đam mê, biểu cảm. Tăng cường bằng ngọc Mộc; cân bằng bằng hành Thủy.",

  },

  Earth: {

    key: "Earth",

    vi: "Thổ",

    emoji: "土",

    color: "#c08a00",

    description:

      "Ổn định, nuôi dưỡng, thực tế và nền tảng.",

    insight:

      "Vững chắc, đáng tin. Tăng cường bằng ngọc Hỏa; cân bằng bằng hành Mộc.",

  },

  Metal: {

    key: "Metal",

    vi: "Kim",

    emoji: "金",

    color: "#7a8090",

    description:

      "Minh mẫn, kỷ luật, nguyên tắc và tính chính xác.",

    insight:

      "Chính xác, nguyên tắc. Tăng cường bằng ngọc Thổ; cân bằng bằng hành Hỏa.",

  },

  Water: {

    key: "Water",

    vi: "Thủy",

    emoji: "水",

    color: "#2a6aaa",

    description:

      "Trí tuệ, thích nghi, trực giác và chiều sâu.",

    insight:

      "Trực giác, linh hoạt. Tăng cường bằng ngọc Kim; cân bằng bằng hành Thổ.",

  },

};



const STEMS: Stem[] = [

  { vi: "Canh", en: "Geng", element: "Metal", polarity: "Yang" },

  { vi: "Tân", en: "Xin", element: "Metal", polarity: "Yin" },

  { vi: "Nhâm", en: "Ren", element: "Water", polarity: "Yang" },

  { vi: "Quý", en: "Gui", element: "Water", polarity: "Yin" },

  { vi: "Giáp", en: "Jia", element: "Wood", polarity: "Yang" },

  { vi: "Ất", en: "Yi", element: "Wood", polarity: "Yin" },

  { vi: "Bính", en: "Bing", element: "Fire", polarity: "Yang" },

  { vi: "Đinh", en: "Ding", element: "Fire", polarity: "Yin" },

  { vi: "Mậu", en: "Wu", element: "Earth", polarity: "Yang" },

  { vi: "Kỷ", en: "Ji", element: "Earth", polarity: "Yin" },

];



const ZODIAC: Branch[] = [

  { vi: "Tý", en: "Rat", emoji: "🐭", element: "Water" },

  { vi: "Sửu", en: "Ox", emoji: "🐂", element: "Earth" },

  { vi: "Dần", en: "Tiger", emoji: "🐯", element: "Wood" },

  { vi: "Mão", en: "Rabbit", emoji: "🐰", element: "Wood" },

  { vi: "Thìn", en: "Dragon", emoji: "🐲", element: "Earth" },

  { vi: "Tỵ", en: "Snake", emoji: "🐍", element: "Fire" },

  { vi: "Ngọ", en: "Horse", emoji: "🐴", element: "Fire" },

  { vi: "Mùi", en: "Goat", emoji: "🐐", element: "Earth" },

  { vi: "Thân", en: "Monkey", emoji: "🐵", element: "Metal" },

  { vi: "Dậu", en: "Rooster", emoji: "🐓", element: "Metal" },

  { vi: "Tuất", en: "Dog", emoji: "🐕", element: "Earth" },

  { vi: "Hợi", en: "Pig", emoji: "🐷", element: "Water" },

];



const HIDDEN_STEMS: Record<number, ElementKey[]> = {

  0: ["Water"],

  1: ["Earth", "Water", "Metal"],

  2: ["Wood", "Fire", "Earth"],

  3: ["Wood"],

  4: ["Earth", "Wood", "Water"],

  5: ["Fire", "Earth", "Metal"],

  6: ["Fire", "Earth"],

  7: ["Earth", "Fire", "Wood"],

  8: ["Metal", "Water", "Earth"],

  9: ["Metal"],

  10: ["Earth", "Metal", "Fire"],

  11: ["Water", "Wood"],

};



const JADE_BY_ELEMENT: Record<ElementKey, JadeRecommendation[]> = {

  Wood: [

    {

      name: "Phỉ Thúy Đế Vương",

      shortName: "Phỉ Thúy",

      bovis: 12000,

      grade: "A",

      description:

        "Jadeite xanh có chiều sâu, gợi sự tăng trưởng, tài lộc và vận hành bền vững.",

    },

    {

      name: "Lam Ngọc Phỉ Thúy",

      shortName: "Lam Ngọc",

      bovis: 11500,

      grade: "A",

      description:

        "Dòng ngọc giao thoa Mộc · Thủy, thiên về bình ổn, sáng rõ và thanh lịch.",

    },

    {

      name: "Ngọc Bích Xanh",

      shortName: "Ngọc Bích",

      bovis: 9500,

      grade: "A",

      description:

        "Ngọc xanh truyền thống, gợi cân bằng cảm xúc và sự bền vững.",

    },

  ],

  Fire: [

    {

      name: "Ngọc Huyết",

      shortName: "Ngọc Huyết",

      bovis: 10500,

      grade: "A",

      description:

        "Sắc ấm tượng trưng cho sinh lực, ý chí và khả năng chuyển hóa thành hành động.",

    },

    {

      name: "Thạch Anh Hồng / Đỏ",

      shortName: "Thạch Anh",

      bovis: 9000,

      grade: "A",

      description:

        "Gợi sự ấm áp, chủ động và cảm xúc tích cực.",

    },

    {

      name: "Mã Não Đỏ / Hồng",

      shortName: "Mã Não",

      bovis: 9000,

      grade: "A",

      description:

        "Dòng đá thiên về năng lượng hành động và sự quyết tâm.",

    },

  ],

  Earth: [

    {

      name: "Hòa Điền Vàng Tân Cương",

      shortName: "Hòa Điền",

      bovis: 11000,

      grade: "A",

      description:

        "Tông ấm, nền tảng và thanh nhã, phù hợp với cảm giác ổn định lâu dài.",

    },

    {

      name: "Tụ Nham Vàng",

      shortName: "Tụ Nham",

      bovis: 8500,

      grade: "A",

      description:

        "Trầm ấm, chắc chắn, gợi khả năng tích lũy và củng cố nền tảng.",

    },

    {

      name: "Mã Não Vàng",

      shortName: "Mã Não",

      bovis: 8500,

      grade: "A",

      description:

        "Năng lượng Thổ ấm áp, thiên về ổn định và nuôi dưỡng.",

    },

  ],

  Metal: [

    {

      name: "Hòa Điền Trắng Mỡ Cừu",

      shortName: "Hòa Điền",

      bovis: 12000,

      grade: "A",

      description:

        "Sắc trắng tinh giản, gợi sự chuẩn mực, minh định và thanh khiết.",

    },

    {

      name: "Bạch Ngọc Hạng A",

      shortName: "Bạch Ngọc",

      bovis: 10000,

      grade: "A",

      description:

        "Dòng ngọc sáng, thanh và tinh giản, gợi sự rõ ràng và kỷ luật.",

    },

    {

      name: "Mắt Mèo Trắng Xám",

      shortName: "Mắt Mèo",

      bovis: 9500,

      grade: "A",

      description:

        "Thiên về trực giác, sự tập trung và cảm giác bảo hộ.",

    },

  ],

  Water: [

    {

      name: "Lam Ngọc Phỉ Thúy",

      shortName: "Lam Ngọc",

      bovis: 11500,

      grade: "A",

      description:

        "Sắc lam gợi sự bình tĩnh, dòng chảy cảm xúc và tư duy sáng rõ.",

    },

    {

      name: "Mã Não Đen",

      shortName: "Mã Não Đen",

      bovis: 9500,

      grade: "A",

      description:

        "Dòng đá thiên về chiều sâu, ổn định cảm xúc và cảm giác bảo hộ.",

    },

    {

      name: "Sơn Thủy Cẩm Thạch",

      shortName: "Sơn Thủy",

      bovis: 8500,

      grade: "B",

      description:

        "Vân tự nhiên như thủy mặc, giao thoa Thủy · Mộc và mang tính độc bản.",

    },

  ],

};



const OUR_TO_STD = [6, 7, 8, 9, 0, 1, 2, 3, 4, 5];

const STD_TO_OUR = [4, 5, 6, 7, 8, 9, 0, 1, 2, 3];

const HOUR_STEM_START_STD = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8];



const MONTH_BRANCH_INDEX = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];



const MONTH_BRANCH_NAMES = [

  "Sửu",

  "Dần",

  "Mão",

  "Thìn",

  "Tỵ",

  "Ngọ",

  "Mùi",

  "Thân",

  "Dậu",

  "Tuất",

  "Hợi",

  "Tý",

];



const createEmptyCounts = (): Record<ElementKey, number> => ({

  Wood: 0,

  Fire: 0,

  Earth: 0,

  Metal: 0,

  Water: 0,

});



const toJdn = (year: number, month: number, day: number) => {

  const a = Math.floor((14 - month) / 12);

  const y = year + 4800 - a;

  const m = month + 12 * a - 3;



  return (

    day +

    Math.floor((153 * m + 2) / 5) +

    365 * y +

    Math.floor(y / 4) -

    Math.floor(y / 100) +

    Math.floor(y / 400) -

    32045

  );

};



const dayDelta = (year: number, month: number, day: number) =>

  toJdn(year, month, day) - toJdn(1900, 1, 1);



const getDayStemIndex = (

  year: number,

  month: number,

  day: number

) => ((4 + dayDelta(year, month, day)) % 10 + 10) % 10;



const getDayBranchIndex = (

  year: number,

  month: number,

  day: number

) => ((10 + dayDelta(year, month, day)) % 12 + 12) % 12;



const getMonthElement = (month: number): ElementKey => {

  const map: Record<number, ElementKey> = {

    1: "Earth",

    2: "Wood",

    3: "Wood",

    4: "Earth",

    5: "Fire",

    6: "Fire",

    7: "Earth",

    8: "Metal",

    9: "Metal",

    10: "Earth",

    11: "Water",

    12: "Water",

  };



  return map[month] || "Earth";

};



const getMonthStemElement = (

  year: number,

  month: number

): ElementKey => {

  const yearStemIdx = ((year - 1900) % 10 + 10) % 10;

  const monthStemIdx =

    ((yearStemIdx % 5) * 24 + (month - 1) * 2) % 10;



  return STEMS[monthStemIdx].element;

};



const getMonthStemIndex = (

  year: number,

  month: number

) => {

  const yearStemIdx = ((year - 1900) % 10 + 10) % 10;

  const yearStd = OUR_TO_STD[yearStemIdx];



  const monthStemStartStd =

    HOUR_STEM_START_STD[

      yearStd % 5 === 0

        ? 4

        : yearStd % 5 === 1

          ? 6

          : yearStd % 5 === 2

            ? 8

            : yearStd % 5 === 3

              ? 0

              : 2

    ];



  return (

    STD_TO_OUR[monthStemStartStd] +

    (month - 1)

  ) % 10;

};



const getHourStemIndex = (

  dayStemIndex: number,

  hourBranchIndex: number

) => {

  const dayStd = OUR_TO_STD[dayStemIndex];

  const hour1Std = HOUR_STEM_START_STD[dayStd];

  const hour1Our = STD_TO_OUR[hour1Std];



  return (hour1Our + hourBranchIndex) % 10;

};



const trueSolarTimeHour = (

  clockHour: number,

  clockMinute: number,

  longitude = 106.66,

  timezone = 7

) => {

  const longitudeCorrection =

    (longitude - timezone * 15) / 15;



  const decimalHour =

    clockHour +

    clockMinute / 60 +

    longitudeCorrection;



  return ((decimalHour % 24) + 24) % 24;

};



const hourBranchFromSolarHour = (solarHour: number) => {

  const adjusted = (solarHour + 1) % 24;

  return Math.floor(adjusted / 2) % 12;

};



const GENERATES: Record<ElementKey, ElementKey> = {

  Wood: "Fire",

  Fire: "Earth",

  Earth: "Metal",

  Metal: "Water",

  Water: "Wood",

};



const CONTROLS: Record<ElementKey, ElementKey> = {

  Wood: "Earth",

  Earth: "Water",

  Water: "Fire",

  Fire: "Metal",

  Metal: "Wood",

};



const getSupportElement = (

  element: ElementKey

): ElementKey => {

  const found = ELEMENT_ORDER.find(

    (key) => GENERATES[key] === element

  );



  return found || element;

};



const calculateDestiny = (form: FormState): DestinyResult => {

  const date = new Date(`${form.birthDate}T00:00:00`);



  const year = date.getFullYear();

  const month = date.getMonth() + 1;

  const day = date.getDate();



  const yearStemIdx = ((year - 1900) % 10 + 10) % 10;

  const yearBranchIdx = ((year - 1900) % 12 + 12) % 12;



  const yearStem = STEMS[yearStemIdx];

  const yearBranch = ZODIAC[yearBranchIdx];



  const monthStemIdx = getMonthStemIndex(year, month);

  const monthStem = {

    ...STEMS[monthStemIdx],

    element: getMonthStemElement(year, month),

  };



  const monthBranchIdx = MONTH_BRANCH_INDEX[month - 1];

  const monthBranch: Branch = {

    ...ZODIAC[monthBranchIdx],

    vi: MONTH_BRANCH_NAMES[month - 1],

    element: getMonthElement(month),

  };



  const dayStemIdx = getDayStemIndex(year, month, day);

  const dayBranchIdx = getDayBranchIndex(year, month, day);



  const dayStem = STEMS[dayStemIdx];

  const dayBranch = ZODIAC[dayBranchIdx];



  let hourIdx = -1;

  let trueSolarHour: number | null = null;



  if (form.birthTime) {

    const [hour, minute] = form.birthTime

      .split(":")

      .map(Number);



    trueSolarHour = trueSolarTimeHour(

      hour,

      minute

    );



    hourIdx = hourBranchFromSolarHour(

      trueSolarHour

    );

  }



  const pillars: PillarRow[] = [

    {

      label: "Trụ Năm",

      stem: yearStem,

      branch: yearBranch,

      note: `${year} · ${yearBranch.emoji} ${yearBranch.vi}`,

    },

    {

      label: "Trụ Tháng",

      stem: monthStem,

      branch: monthBranch,

      note: `Tháng ${month}`,

    },

    {

      label: "Trụ Ngày",

      stem: dayStem,

      branch: dayBranch,

      note: `Ngày ${day}`,

    },

  ];



  if (hourIdx >= 0) {

    const hourStemIdx = getHourStemIndex(

      dayStemIdx,

      hourIdx

    );



    pillars.push({

      label: "Trụ Giờ",

      stem: STEMS[hourStemIdx],

      branch: ZODIAC[hourIdx],

      note: form.birthTime,

    });

  }



  const counts = createEmptyCounts();



  pillars.forEach((pillar) => {

    counts[pillar.stem.element] += 1;

    counts[pillar.branch.element] += 1;

  });



  const combined = { ...counts };



  const branchIndices = [

    yearBranchIdx,

    monthBranchIdx,

    dayBranchIdx,

    ...(hourIdx >= 0 ? [hourIdx] : []),

  ];



  branchIndices.forEach((branchIdx) => {

    (HIDDEN_STEMS[branchIdx] || []).forEach(

      (element) => {

        combined[element] += 0.5;

      }

    );

  });



  let mainElement = yearStem.element;

  let maxCount = -1;



  ELEMENT_ORDER.forEach((element) => {

    if (counts[element] > maxCount) {

      maxCount = counts[element];

      mainElement = element;

    }

  });



  const missingElements = ELEMENT_ORDER.filter(

    (element) => counts[element] === 0

  );



  const dayMasterElement = dayStem.element;

  const supportElement =

    getSupportElement(dayMasterElement);



  let dayMasterScore =

    counts[dayMasterElement] || 0;



  dayMasterScore +=

    (counts[supportElement] || 0) * 0.5;



  const dayMasterStrong =

    dayMasterScore >= 3;



  const yongShenElement =

    dayMasterStrong

      ? CONTROLS[dayMasterElement]

      : supportElement;



  return {

    fullName: form.fullName.trim(),

    birthDate: form.birthDate,

    gender: form.gender,

    year,

    month,

    day,

    hourIdx,

    trueSolarHour,

    pillars,

    counts,

    combined,

    mainElement,

    missingElements,

    dayMasterElement,

    dayMasterStem: dayStem,

    dayMasterStrong,

    dayMasterScore,

    yongShenElement,

  };

};



const DestinyPage: React.FC = () => {

  const location = useLocation();



  const navigationState =

    (location.state as HomeDestinyNavigationState | null) || null;



  const [form, setForm] = useState<FormState>(() => ({

    fullName:

      navigationState?.destinyForm?.fullName || "",

    birthDate:

      navigationState?.destinyForm?.birthDate || "",

    birthTime:

      navigationState?.destinyForm?.birthTime || "",

    gender:

      navigationState?.destinyForm?.gender || "any",

  }));



  const [result, setResult] =

    useState<DestinyResult | null>(null);



  const [error, setError] = useState("");



  // Kết quả được tính trước nhưng chỉ mở sau khi khách nhập số điện thoại.

  const [isResultUnlocked, setIsResultUnlocked] = useState(false);

  const [unlockCountryCode, setUnlockCountryCode] = useState(

    navigationState?.phoneCountryCode || "+84"

  );

  const [unlockPhone, setUnlockPhone] = useState(

    (navigationState?.phoneCountryCode || "+84") === "+84"

      ? normalizeVietnamPhoneInput(navigationState?.phone || "")

      : navigationState?.phone || ""

  );

  const [unlockLoading, setUnlockLoading] = useState(false);

  const [unlockError, setUnlockError] = useState("");



  const [feedbackRating, setFeedbackRating] = useState(0);

  const [feedbackText, setFeedbackText] = useState("");

  const [feedbackLoading, setFeedbackLoading] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState("");

  const [feedbackTone, setFeedbackTone] =

    useState<"success" | "error" | "">("");



  const [feedbackSlides, setFeedbackSlides] =

    useState<DestinyFeedbackSlide[]>(

      loadStoredDestinyFeedbacks

    );



  const [

    feedbackSlideIndex,

    setFeedbackSlideIndex,

  ] = useState(0);

  // A single feedback area on the hero; editor appears only on request after unlock.
  const [feedbackEditorOpen, setFeedbackEditorOpen] = useState(false);
  const feedbackViewportRef = useRef<HTMLDivElement | null>(null);
  const [feedbackVisibleCount, setFeedbackVisibleCount] = useState(() => {
    if (typeof window === "undefined") return 3;
    return window.innerWidth <= 760 ? 1 : window.innerWidth <= 1100 ? 2 : 3;
  });
  const maxFeedbackIndex = Math.max(0, feedbackSlides.length - feedbackVisibleCount);

  const goToFeedback = (requestedIndex: number) => {
    const maxIndex = Math.max(0, feedbackSlides.length - feedbackVisibleCount);
    const nextIndex = requestedIndex > maxIndex ? 0 : requestedIndex < 0 ? maxIndex : requestedIndex;
    setFeedbackSlideIndex(nextIndex);

    const viewport = feedbackViewportRef.current;
    const slides = viewport?.querySelectorAll<HTMLElement>(".kj-destiny-feedback-slide");
    const first = slides?.[0];
    const target = slides?.[nextIndex];
    if (viewport && first && target) {
      viewport.scrollTo({
        left: target.offsetLeft - first.offsetLeft,
        behavior: "smooth",
      });
    }
  };

  // Keep the index in sync with manual swipes (iOS / Android).
  const handleFeedbackScroll = () => {
    const viewport = feedbackViewportRef.current;
    const slides = viewport?.querySelectorAll<HTMLElement>(".kj-destiny-feedback-slide");
    if (!viewport || !slides?.length) return;
    const width = slides[0].getBoundingClientRect().width;
    const gap = parseFloat(window.getComputedStyle(slides[0].parentElement!).gap || "0") || 0;
    const current = Math.round(viewport.scrollLeft / (width + gap));
    setFeedbackSlideIndex(Math.max(0, Math.min(maxFeedbackIndex, current)));
  };

  useEffect(() => {
    const updateFeedbackColumns = () => {
      const columns = window.innerWidth <= 760 ? 1 : window.innerWidth <= 1100 ? 2 : 3;
      setFeedbackVisibleCount(columns);
      setFeedbackSlideIndex(0);
      feedbackViewportRef.current?.scrollTo({ left: 0, behavior: "auto" });
    };
    window.addEventListener("resize", updateFeedbackColumns);
    return () => window.removeEventListener("resize", updateFeedbackColumns);
  }, []);




  /*

    Nếu người dùng gửi form từ Homepage:

    - dữ liệu đã được lưu về Admin trước khi navigate

    - DestinyPage nhận lại fullName / ngày sinh / giờ sinh / giới tính

    - tự tính và hiển thị kết quả, không bắt nhập lại

  */

  useEffect(() => {

    if (

      !navigationState?.fromHomeDestiny ||

      !navigationState?.autoCalculate

    ) {

      return;

    }



    const incomingForm: FormState = {

      fullName:

        navigationState.destinyForm?.fullName || "",

      birthDate:

        navigationState.destinyForm?.birthDate || "",

      birthTime:

        navigationState.destinyForm?.birthTime || "",

      gender:

        navigationState.destinyForm?.gender || "any",

    };



    if (!incomingForm.birthDate) {

      return;

    }



    setForm(incomingForm);

    setError("");



    const nextResult =

      calculateDestiny(incomingForm);



    setResult(nextResult);



    // Từ Homepage: tự tính kết quả nhưng chỉ mở phần tổng quan + mục 01 + mục 02.

    // Từ mục 03 trở xuống vẫn khóa giống luồng Mệnh Khuyết.

    // Số điện thoại đã nhập ở Homepage được điền sẵn để khách không phải nhập lại.

    setIsResultUnlocked(false);
    setFeedbackEditorOpen(false);

    setUnlockCountryCode(navigationState.phoneCountryCode || "+84");

    setUnlockPhone(

      (navigationState.phoneCountryCode || "+84") === "+84"

        ? normalizeVietnamPhoneInput(navigationState.phone || "")

        : navigationState.phone || ""

    );

    setUnlockError("");



    window.setTimeout(() => {

      document

        .getElementById("destiny-result")

        ?.scrollIntoView({

          behavior: "smooth",

          block: "start",

        });

    }, 120);

    // Chỉ tự động tính khi DestinyPage nhận dữ liệu từ Homepage.

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);



  const recommendationElement =

    result?.missingElements[0] ||

    result?.yongShenElement ||

    result?.mainElement ||

    "Wood";



  const recommendations = useMemo(

    () => JADE_BY_ELEMENT[recommendationElement],

    [recommendationElement]

  );



  const handleSubmit = (

    event: FormEvent<HTMLFormElement>

  ) => {

    event.preventDefault();



    if (!form.birthDate) {

      setError(

        "Vui lòng chọn ngày tháng năm sinh."

      );

      return;

    }



    setError("");



    const nextResult =

      calculateDestiny(form);



    setResult(nextResult);



    // Mỗi lần tính lại: chỉ hiển thị tổng quan + mục 01 + mục 02.

    // Phần 03 trở xuống phải mở khóa riêng.

    setIsResultUnlocked(false);
    setFeedbackEditorOpen(false);

    setUnlockCountryCode(navigationState?.phoneCountryCode || "+84");

    setUnlockPhone(

      (navigationState?.phoneCountryCode || "+84") === "+84"

        ? normalizeVietnamPhoneInput(navigationState?.phone || "")

        : navigationState?.phone || ""

    );

    setUnlockError("");



    window.setTimeout(() => {

      document

        .getElementById("destiny-result")

        ?.scrollIntoView({

          behavior: "smooth",

          block: "start",

        });

    }, 20);

  };



  const handleUnlockResult = async (

    event: FormEvent<HTMLFormElement>

  ) => {

    event.preventDefault();



    if (!result) {

      return;

    }



    const phoneDigits = unlockPhone.replace(/\D/g, "");



    if (

      unlockCountryCode === "+84" &&

      !/^[1-9]\d{8}$/.test(phoneDigits)

    ) {

      setUnlockError(

        "Số điện thoại Việt Nam (+84) phải gồm đúng 9 chữ số, không có số 0 ở đầu."

      );

      return;

    }



    if (

      unlockCountryCode !== "+84" &&

      !/^\d{6,15}$/.test(phoneDigits)

    ) {

      setUnlockError(

        "Số điện thoại quốc tế phải gồm từ 6 đến 15 chữ số."

      );

      return;

    }



    // Người dùng Việt Nam nhập 9 chữ số, không có số 0 đầu.

    // Khi lưu về Admin, ghép mã quốc gia thành dạng +84901191141.

    const fullPhone = `${unlockCountryCode}${phoneDigits}`;



    const genderLabel =

      form.gender === "male"

        ? "Nam"

        : form.gender === "female"

          ? "Nữ"

          : "Không xác định";



    const missingElementText =

      result.missingElements.length > 0

        ? result.missingElements

            .map((element) => ELEMENTS[element].vi)

            .join(", ")

        : "Đủ 5 hành";



    const message = [

      "Khách mở khóa kết quả Ngũ Hành trên website.",

      `Họ tên: ${form.fullName.trim() || "Chưa cung cấp"}`,

      `Ngày sinh: ${form.birthDate}`,

      `Giờ sinh: ${form.birthTime || "Không cung cấp"}`,

      `Giới tính: ${genderLabel}`,

      `Hành chính: ${ELEMENTS[result.mainElement].vi}`,

      `Hành còn thiếu: ${missingElementText}`,

      `Day Master: ${ELEMENTS[result.dayMasterElement].vi}`,

      `Dụng thần tham khảo: ${ELEMENTS[result.yongShenElement].vi}`,

    ].join("\n");



    try {

      setUnlockLoading(true);

      setUnlockError("");



      /*

        Nếu đi từ Homepage thì lead đã được gửi ở Homepage trước khi navigate.

        Không gửi lần 2 để tránh trùng dữ liệu trong Admin.

        Nếu người dùng vào trực tiếp trang Xem Mệnh, lead chỉ được gửi đúng

        tại thời điểm bấm mở khóa kết quả.

      */

      if (!navigationState?.fromHomeDestiny) {

        await contactApi.createContactLead({

          fullName: form.fullName.trim() || "Khách xem mệnh",

          phone: fullPhone,

          email: "",

          need: "Chọn ngọc theo bản mệnh",

          preferredContactChannel: "phone",

          message,

          productId: "",

          productName: "",

          productSlug: "",

          source: "destiny_page_result_unlock",

        });

      }



      setIsResultUnlocked(true);



      window.setTimeout(() => {

        document

          .getElementById("destiny-result")

          ?.scrollIntoView({

            behavior: "smooth",

            block: "start",

          });

      }, 100);

    } catch (requestError) {

      const apiError = requestError as Error;

      setUnlockError(

        apiError.message ||

          "Không thể lưu thông tin lúc này. Vui lòng thử lại."

      );

    } finally {

      setUnlockLoading(false);

    }

  };



  const handleFeedbackSubmit = async (

    event: FormEvent<HTMLFormElement>

  ) => {

    event.preventDefault();



    if (!result) {

      return;

    }



    if (feedbackRating < 1 || feedbackRating > 5) {

      setFeedbackTone("error");

      setFeedbackMessage("Bạn chọn số sao trước nha.");

      return;

    }



    if (feedbackText.trim().length < 8) {

      setFeedbackTone("error");

      setFeedbackMessage(

        "Bạn chia sẻ thêm một chút cảm nhận để King Jades ghi nhận nha."

      );

      return;

    }



    setFeedbackLoading(true);

    setFeedbackTone("");

    setFeedbackMessage("");



    /*

     * FRONTEND ONLY / DEMO:

     * - Không gửi feedback về Admin.

     * - Không gọi API.

     * - Chỉ lưu localStorage của trình duyệt.

     * - Tối đa 30 feedback gần nhất.

     * - Feedback mới nhất nằm đầu danh sách.

     */

    const submittedFeedback: DestinyFeedbackSlide = {

      id: `${Date.now()}-${Math.random()

        .toString(16)

        .slice(2)}`,

      name:

        form.fullName.trim() ||

        "Khách hàng King Jades",

      rating: feedbackRating,

      text: feedbackText.trim(),

      createdAt: new Date().toISOString(),

    };



    setFeedbackSlides((previous) => {

      const next = [

        submittedFeedback,

        ...previous,

      ].slice(0, MAX_DESTINY_FEEDBACKS);



      saveStoredDestinyFeedbacks(next);



      return next;

    });



    setFeedbackSlideIndex(0);
    feedbackViewportRef.current?.scrollTo({ left: 0, behavior: "smooth" });

    setFeedbackTone("success");

    setFeedbackMessage(

      "Cảm ơn bạn. Cảm nhận vừa gửi đã xuất hiện trong slider bên dưới."

    );

    setFeedbackText("");



    window.setTimeout(() => {

      document

        .getElementById("destiny-feedback-slider")

        ?.scrollIntoView({

          behavior: "smooth",

          block: "center",

        });

    }, 160);



    window.setTimeout(() => {

      setFeedbackLoading(false);

    }, 220);

  };



  useEffect(() => {
    if (feedbackSlides.length <= feedbackVisibleCount) return;
    const timer = window.setTimeout(() => {
      goToFeedback(feedbackSlideIndex + 1);
    }, 4600);
    return () => window.clearTimeout(timer);
  }, [feedbackSlides.length, feedbackVisibleCount, feedbackSlideIndex]);

  const mainInfo = result

    ? ELEMENTS[result.mainElement]

    : null;



  const yongShenInfo = result

    ? ELEMENTS[result.yongShenElement]

    : null;



  return (

    <>

      <Header />



      <main className="kj-destiny-page">

        <section className="kj-destiny-hero">

          <div className="kj-destiny-hero__glow kj-destiny-hero__glow--left" />

          <div className="kj-destiny-hero__glow kj-destiny-hero__glow--right" />



          <div className="kj-destiny-shell">

            <div className="kj-destiny-intro">

              <span className="kj-destiny-eyebrow">

                五行 · Ngũ Hành

              </span>



              <h1>

                Tìm <em>Mệnh Chính</em>

                <br />

                & Hành Còn Thiếu

              </h1>



              <p>

                Nhập ngày sinh và giờ sinh để xem

                Tứ Trụ theo logic từ bản KingJades

                Xem Mệnh: hành chính, hành còn

                thiếu, Nhật Chủ và dòng ngọc gợi

                ý để tham khảo cân bằng.

              </p>



              <div className="kj-destiny-intro__notes">

                <span>Thiên Can</span>

                <i />

                <span>Địa Chi</span>

                <i />

                <span>Ngũ Hành</span>

                <i />

                <span>Ngọc gợi ý</span>

              </div>

            </div>



            <form

              className="kj-destiny-form"

              onSubmit={handleSubmit}

            >

              <div className="kj-destiny-form__header">

                <span>Birth Details</span>

                <h2>Thông tin ngày sinh</h2>

              </div>



              <label className="kj-destiny-field">

                <span>Họ tên</span>

                <input

                  type="text"

                  value={form.fullName}

                  onChange={(event) =>

                    setForm((previous) => ({

                      ...previous,

                      fullName:

                        event.target.value,

                    }))

                  }

                  placeholder="Nhập họ tên"

                  autoComplete="name"

                />

                <small>

                  Dùng để cá nhân hóa kết quả.

                </small>

              </label>



              <label className="kj-destiny-field">

                <span>

                  Ngày tháng năm sinh *

                </span>

                <input

                  type="date"

                  min="1900-01-01"

                  value={form.birthDate}

                  onChange={(event) =>

                    setForm((previous) => ({

                      ...previous,

                      birthDate:

                        event.target.value,

                    }))

                  }

                  required

                />

              </label>



              <div className="kj-destiny-form__row">

                <label className="kj-destiny-field">

                  <span>Giờ sinh</span>

                  <input

                    type="time"

                    value={form.birthTime}

                    onChange={(event) =>

                      setForm((previous) => ({

                        ...previous,

                        birthTime:

                          event.target.value,

                      }))

                    }

                  />

                  <small>

                    Có thể bỏ qua nếu không nhớ.

                  </small>

                </label>



                <label className="kj-destiny-field">

                  <span>Giới tính</span>

                  <select

                    value={form.gender}

                    onChange={(event) =>

                      setForm((previous) => ({

                        ...previous,

                        gender:

                          event.target

                            .value as FormState["gender"],

                      }))

                    }

                  >

                    <option value="any">

                      Không xác định

                    </option>

                    <option value="male">

                      Nam

                    </option>

                    <option value="female">

                      Nữ

                    </option>

                  </select>

                  <small>

                    Chỉ dùng cho phần ghi chú.

                  </small>

                </label>

              </div>



              {error && (

                <p className="kj-destiny-error">

                  {error}

                </p>

              )}



              <button

                className="kj-destiny-submit"

                type="submit"

              >

                Xem Ngũ Hành Của Tôi

                <span>→</span>

              </button>

            </form>

          </div>



          <div className="kj-destiny-shell kj-destiny-feedback-showcase-shell">

            <section

              id="destiny-feedback-slider"

              className="kj-destiny-feedback-slider kj-destiny-feedback-slider--hero"

              aria-label="Cảm nhận sau khi xem Mệnh Khuyết"

            >

              <div className="kj-destiny-feedback-slider__head">

                <div>

                  <span className="kj-destiny-eyebrow">

                    Cảm nhận tại King Jades

                  </span>

                  <h2>

                    Chia sẻ sau khi xem Mệnh Khuyết

                  </h2>

                </div>



                <div className="kj-destiny-feedback-slider__actions">
                  {isResultUnlocked && (
                    <button
                      type="button"
                      className="kj-destiny-feedback-slider__write"
                      aria-expanded={feedbackEditorOpen}
                      aria-controls="destiny-feedback-editor"
                      onClick={() => setFeedbackEditorOpen((previous) => !previous)}
                    >
                      {feedbackEditorOpen ? "Đóng đánh giá" : "Viết cảm nhận"}
                    </button>
                  )}
                  {feedbackSlides.length > feedbackVisibleCount && (
                    <div className="kj-destiny-feedback-slider__controls">
                      <button type="button" aria-label="Feedback trước" onClick={() => goToFeedback(feedbackSlideIndex - 1)}>←</button>
                      <span>{feedbackSlideIndex + 1}–{Math.min(feedbackSlides.length, feedbackSlideIndex + feedbackVisibleCount)}/{feedbackSlides.length}</span>
                      <button type="button" aria-label="Feedback tiếp theo" onClick={() => goToFeedback(feedbackSlideIndex + 1)}>→</button>
                    </div>
                  )}
                </div>

              </div>



              {feedbackSlides.length > 0 ? (

                <>

                  <div
                    className="kj-destiny-feedback-slider__viewport"
                    ref={feedbackViewportRef}
                    onScroll={handleFeedbackScroll}
                  >
                    <div className={`kj-destiny-feedback-slider__track is-${Math.min(feedbackSlides.length, feedbackVisibleCount)}`}>
                      {feedbackSlides.map((item) => (

                        <article

                          className="kj-destiny-feedback-slide"

                          key={item.id}

                        >

                          <div className="kj-destiny-feedback-slide__rating">

                            <span>

                              {"★".repeat(item.rating)}

                              <i>

                                {"★".repeat(5 - item.rating)}

                              </i>

                            </span>



                            <b>{item.rating}/5</b>

                          </div>



                          <blockquote>

                            “{item.text}”

                          </blockquote>



                          <footer>

                            <div>

                              <strong>{item.name}</strong>

                              <small>

                                Cảm nhận sau khi xem Mệnh Khuyết

                              </small>

                            </div>



                            <span>King Jades ✦</span>

                          </footer>

                        </article>

                      ))}

                    </div>

                  </div>



                  {feedbackSlides.length > feedbackVisibleCount && (
                    <div className="kj-destiny-feedback-slider__dots">
                      {feedbackSlides.slice(0, maxFeedbackIndex + 1).map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          className={index === feedbackSlideIndex ? "is-active" : ""}
                          aria-label={`Xem cảm nhận từ ${index + 1}`}
                          onClick={() => goToFeedback(index)}
                        />
                      ))}
                    </div>
                  )}

                </>

              ) : (

                <div className="kj-destiny-feedback-slider__empty">

                  <span>✦</span>

                  <div>

                    <strong>Cảm nhận của khách hàng sẽ xuất hiện tại đây.</strong>

                    <p>

                      Sau khi xem Mệnh Khuyết và gửi đánh giá, chia sẻ mới nhất

                      sẽ được đưa lên đầu slider này.

                    </p>

                  </div>

                </div>

              )}

              {isResultUnlocked && feedbackEditorOpen && (
                <div id="destiny-feedback-editor" className="kj-destiny-feedback-slider__composer">
                <form

                  className="kj-destiny-feedback__form"

                  onSubmit={handleFeedbackSubmit}

                >

                  <div className="kj-destiny-feedback__form-head">

                    <div>

                      <small>ĐÁNH GIÁ TRẢI NGHIỆM</small>

                      <h3>Chia sẻ cảm nhận của bạn</h3>

                    </div>



                    <span>

                      {feedbackRating > 0

                        ? `${feedbackRating}/5`

                        : "Chưa chấm"}

                    </span>

                  </div>



                  <div

                    className="kj-destiny-feedback__stars"

                    role="radiogroup"

                    aria-label="Đánh giá kết quả xem mệnh từ 1 đến 5 sao"

                  >

                    {[1, 2, 3, 4, 5].map((star) => (

                      <button

                        key={star}

                        type="button"

                        role="radio"

                        aria-checked={feedbackRating === star}

                        aria-label={`${star} sao`}

                        className={

                          star <= feedbackRating

                            ? "is-active"

                            : ""

                        }

                        onClick={() => {

                          setFeedbackRating(star);

                          setFeedbackTone("");

                          setFeedbackMessage("");

                        }}

                        disabled={feedbackLoading}

                      >

                        ★

                      </button>

                    ))}

                  </div>



                  <label className="kj-destiny-feedback__field">

                    <span>Cảm nhận của bạn</span>

                    <textarea

                      value={feedbackText}

                      maxLength={600}

                      rows={5}

                      placeholder="Ví dụ: Phần Mệnh Khuyết dễ hiểu, gợi ý ngọc rõ ràng..."

                      onChange={(event) => {

                        setFeedbackText(event.target.value);

                        setFeedbackTone("");

                        setFeedbackMessage("");

                      }}

                      disabled={feedbackLoading}

                    />

                    <small>

                      {feedbackText.length}/600 ký tự

                    </small>

                  </label>



                  {feedbackMessage && (

                    <div

                      className={`kj-destiny-feedback__message ${feedbackTone}`}

                    >

                      {feedbackMessage}

                    </div>

                  )}



                  <button

                    className="kj-destiny-feedback__submit"

                    type="submit"

                    disabled={feedbackLoading}

                  >

                    {feedbackLoading

                      ? "Đang gửi..."

                      : "Gửi cảm nhận"}

                    {!feedbackLoading && <span>→</span>}

                  </button>

                </form>
                </div>
              )}
            </section>

          </div>

        </section>



        {result && mainInfo && yongShenInfo && (

          <section

            id="destiny-result"

            className={`kj-destiny-results ${!isResultUnlocked ? "is-locked" : "is-unlocked"}`}

          >

            <div className="kj-destiny-result-frame">

              <div className="kj-destiny-shell">

              <article className="kj-destiny-summary">

                <span className="kj-destiny-summary__eyebrow">

                  Kết quả lá số của{" "}

                  {result.fullName || "bạn"}

                </span>



                <div className="kj-destiny-summary__elements">

                  <div>

                    <span

                      className="kj-destiny-summary__symbol"

                      style={{

                        color: mainInfo.color,

                      }}

                    >

                      {mainInfo.emoji}

                    </span>



                    <small>Hành chính</small>

                    <strong

                      style={{

                        color: mainInfo.color,

                      }}

                    >

                      {mainInfo.vi}

                    </strong>

                  </div>



                  <span className="kj-destiny-summary__arrow">

                    →

                  </span>



                  {result.missingElements.length >

                  0 ? (

                    <div>

                      <span

                        className="kj-destiny-summary__symbol"

                        style={{

                          color:

                            ELEMENTS[

                              result

                                .missingElements[0]

                            ].color,

                        }}

                      >

                        {

                          ELEMENTS[

                            result

                              .missingElements[0]

                          ].emoji

                        }

                      </span>

                      <small>Hành còn thiếu</small>

                      <strong

                        style={{

                          color:

                            ELEMENTS[

                              result

                                .missingElements[0]

                            ].color,

                        }}

                      >

                        {

                          ELEMENTS[

                            result

                              .missingElements[0]

                          ].vi

                        }

                      </strong>

                    </div>

                  ) : (

                    <div>

                      <span className="kj-destiny-summary__symbol">

                        ✓

                      </span>

                      <small>Trạng thái</small>

                      <strong>

                        Đủ 5 hành

                      </strong>

                    </div>

                  )}

                </div>



                <p>

                  {mainInfo.insight}

                </p>



                <div className="kj-destiny-summary__chips">

                  <span>

                    Day Master:{" "}

                    {

                      ELEMENTS[

                        result.dayMasterElement

                      ].vi

                    }

                  </span>



                  <span>

                    Dụng thần tham khảo:{" "}

                    {yongShenInfo.vi}

                  </span>



                  {result.hourIdx < 0 && (

                    <span className="warning">

                      Thiếu giờ sinh · kết quả

                      dựa trên 3 trụ

                    </span>

                  )}

                </div>

              </article>



              <section className="kj-destiny-block">

                <header className="kj-destiny-section-title">

                  <span>01</span>

                  <div>

                    <small>

                      Luận Giải Tứ Trụ

                    </small>

                    <h2>

                      Cân bằng Ngũ Hành

                    </h2>

                  </div>

                </header>



                <div className="kj-destiny-element-grid">

                  {ELEMENT_ORDER.map(

                    (element) => {

                      const info =

                        ELEMENTS[element];



                      const count =

                        result.counts[element];



                      const isMain =

                        element ===

                        result.mainElement;



                      const isMissing =

                        count === 0;



                      return (

                        <article

                          key={element}

                          className={[

                            "kj-destiny-element-card",

                            isMain

                              ? "is-main"

                              : "",

                            isMissing

                              ? "is-missing"

                              : "",

                          ]

                            .filter(Boolean)

                            .join(" ")}

                          style={

                            {

                              "--element-color":

                                info.color,

                            } as React.CSSProperties

                          }

                        >

                          <span>

                            {info.emoji}

                          </span>



                          <strong>

                            {info.vi}

                          </strong>



                          <b>{count}</b>



                          <small>

                            {isMain

                              ? "CHÍNH MỆNH"

                              : isMissing

                                ? "CÒN THIẾU"

                                : "CÓ TRONG LÁ SỐ"}

                          </small>

                        </article>

                      );

                    }

                  )}

                </div>

              </section>



              <section className="kj-destiny-block">

                <header className="kj-destiny-section-title">

                  <span>02</span>

                  <div>

                    <small>

                      Lá Số Bát Tự

                    </small>

                    <h2>

                      Bảng Tứ Trụ Bát Tự

                    </h2>

                  </div>

                </header>



                <div className="kj-destiny-table-wrap">

                  <table className="kj-destiny-table">

                    <thead>

                      <tr>

                        <th>Trụ</th>

                        <th>Thiên Can</th>

                        <th>Địa Chi</th>

                        <th>Ngũ Hành</th>

                        <th>Ghi chú</th>

                      </tr>

                    </thead>



                    <tbody>

                      {result.pillars.map(

                        (pillar) => (

                          <tr key={pillar.label}>

                            <td>

                              <strong>

                                {pillar.label}

                              </strong>

                            </td>



                            <td>

                              {pillar.stem.vi}

                              <ElementBadge

                                element={

                                  pillar.stem

                                    .element

                                }

                              />

                            </td>



                            <td>

                              {pillar.branch.emoji}{" "}

                              {pillar.branch.vi}

                              <ElementBadge

                                element={

                                  pillar.branch

                                    .element

                                }

                              />

                            </td>



                            <td>

                              <ElementBadge

                                element={

                                  pillar.stem

                                    .element

                                }

                              />

                              {pillar.stem

                                .element !==

                                pillar.branch

                                  .element && (

                                <ElementBadge

                                  element={

                                    pillar.branch

                                      .element

                                  }

                                />

                              )}

                            </td>



                            <td>

                              {pillar.note}

                            </td>

                          </tr>

                        )

                      )}

                    </tbody>

                  </table>

                </div>

              </section>



              {/* Chỉ khóa từ mục 03 trở xuống.

                  Phần tổng quan + mục 01 + mục 02 vẫn luôn hiển thị. */}

              <div

                className={[

                  "kj-destiny-locked-zone",

                  !isResultUnlocked ? "is-locked" : "is-unlocked",

                ]

                  .filter(Boolean)

                  .join(" ")}

              >

                <div

                  className={[

                    "kj-destiny-result-content",

                    !isResultUnlocked ? "is-locked" : "is-unlocked",

                  ]

                    .filter(Boolean)

                    .join(" ")}

                  aria-hidden={!isResultUnlocked}

                >



              <section className="kj-destiny-block">

                <header className="kj-destiny-section-title">

                  <span>03</span>

                  <div>

                    <small>

                      Nhật Chủ

                    </small>

                    <h2>

                      Nhật chủ & Dụng thần

                    </h2>

                  </div>

                </header>



                <div className="kj-destiny-daymaster">

                  <article>

                    <small>Nhật chủ</small>

                    <strong>

                      {result.dayMasterStem.vi} ·{" "}

                      {

                        ELEMENTS[

                          result.dayMasterElement

                        ].vi

                      }

                    </strong>

                    <p>

                      Thiên Can ngày được dùng làm

                      Day Master trong logic gốc.

                    </p>

                  </article>



                  <article>

                    <small>Độ mạnh tham khảo</small>

                    <strong>

                      {result.dayMasterStrong

                        ? "Mạnh"

                        : "Yếu / cần hỗ trợ"}

                    </strong>

                    <p>

                      Điểm:{" "}

                      {result.dayMasterScore.toFixed(

                        1

                      )}

                    </p>

                  </article>



                  <article>

                    <small>

                      Dụng thần tham khảo

                    </small>

                    <strong>

                      {yongShenInfo.vi}

                    </strong>

                    <p>

                      {yongShenInfo.description}

                    </p>

                  </article>



                  <article>

                    <small>

                      Giờ mặt trời

                    </small>

                    <strong>

                      {result.trueSolarHour ===

                      null

                        ? "Chưa có giờ sinh"

                        : `${result.trueSolarHour.toFixed(

                            2

                          )}h`}

                    </strong>

                    <p>

                      Hiệu chỉnh theo kinh độ TP.

                      Hồ Chí Minh như bản nguồn.

                    </p>

                  </article>

                </div>

              </section>



              <section className="kj-destiny-block">

                <header className="kj-destiny-section-title">

                  <span>04</span>

                  <div>

                    <small>

                      Dựa Trên Bản Mệnh

                    </small>

                    <h2>

                      Ngọc đề xuất để tham khảo

                      cân bằng

                    </h2>

                  </div>

                </header>



                <div className="kj-destiny-jade-grid">

                  {recommendations.map(

                    (jade, index) => (

                      <article

                        key={jade.name}

                        className="kj-destiny-jade-card"

                      >

                        <span>

                          0{index + 1}

                        </span>



                        <div

                          className="kj-destiny-jade-card__stone"

                          style={{

                            background:

                              ELEMENTS[

                                recommendationElement

                              ].color,

                          }}

                        />



                        <small>

                          Hành{" "}

                          {

                            ELEMENTS[

                              recommendationElement

                            ].vi

                          }{" "}

                          · Ngọc Loại {jade.grade}

                        </small>



                        <h3>{jade.name}</h3>



                        <p>

                          {jade.description}

                        </p>



                        <div className="kj-destiny-jade-card__meta">

                          <span>

                            ⚡{" "}

                            {jade.bovis.toLocaleString(

                              "vi-VN"

                            )}{" "}

                            BU

                          </span>

                        </div>



                        <Link

                          to={`/products?search=${encodeURIComponent(

                            jade.shortName

                          )}`}

                        >

                          Xem dòng ngọc

                          <span>→</span>

                        </Link>

                      </article>

                    )

                  )}

                </div>

              </section>



              <section className="kj-destiny-why">

                <div>

                  <span className="kj-destiny-eyebrow">

                    Vì sao ra kết quả này?

                  </span>



                  <h2>

                    Kết quả dựa trên tần suất

                    Thiên Can & Địa Chi.

                  </h2>

                </div>



                <div className="kj-destiny-why__copy">

                  <p>

                    Hành chính được chọn từ hành

                    xuất hiện nhiều nhất trong các

                    trụ hiện có. Hành bằng 0 được

                    xem là hành còn thiếu trong

                    phép tính của bản nguồn.

                  </p>



                  <p>

                    Khi có giờ sinh, hệ thống thêm

                    Trụ Giờ và hiệu chỉnh giờ mặt

                    trời theo TP.HCM trước khi xác

                    định Địa Chi giờ.

                  </p>



                  <p>

                    Đây là công cụ tham khảo theo

                    logic của prototype KingJades,

                    không thay thế tư vấn Bát Tự

                    chuyên sâu.

                  </p>

                </div>

              </section>







              <section className="kj-destiny-cta">

                <div>

                  <span>

                    TƯ VẤN RIÊNG DÀNH CHO BẠN

                  </span>

                  <h2>

                    Muốn chuyên viên đối chiếu

                    thêm trước khi chọn ngọc?

                  </h2>

                  <p>

                    Gửi kết quả và nhu cầu của bạn

                    để King Jades hỗ trợ riêng.

                  </p>

                </div>



                <div>

                  <a

                    href={ZALO_URL}

                    target="_blank"

                    rel="noreferrer"

                  >

                    Tư vấn qua Zalo

                  </a>



                  <Link to="/contact">

                    Đặt lịch tư vấn

                  </Link>

                </div>

              </section>



              <p className="kj-destiny-disclaimer">

               King Jades luận giải kết quả dựa trên Thiên Can và Địa Chi của các trụ hiện có. Để có góc nhìn đầy đủ hơn về Bát Tự, Đại Vận và các yếu tố chuyên sâu, quý khách có thể tham khảo thêm tư vấn từ chuyên gia.

              </p>

                </div>



              {!isResultUnlocked && (

                <div className="kj-destiny-result-gate">

                  <form

                    className="kj-destiny-result-gate__card"

                    onSubmit={handleUnlockResult}

                  >

                    <span className="kj-destiny-result-gate__icon">✦</span>

                    <small>Kết quả của bạn đã sẵn sàng</small>

                    <h2>Mở khóa kết quả Ngũ Hành</h2>

                    <p>

                      {navigationState?.fromHomeDestiny ? (

                        <>

                          Bạn đã xem phần tổng quan, Cân bằng Ngũ Hành và Bảng Tứ Trụ.

                          Số điện thoại từ Homepage đã được điền sẵn. Bấm Xem kết quả

                          để mở phần phân tích chuyên sâu, Dụng thần và gợi ý dòng ngọc phù hợp.

                        </>

                      ) : (

                        <>

                          Bạn đã xem phần tổng quan, Cân bằng Ngũ Hành và Bảng Tứ Trụ.

                          Nhập số điện thoại để mở phần phân tích chuyên sâu, Dụng thần

                          và gợi ý dòng ngọc phù hợp. Thông tin ngày sinh sẽ được gửi

                          cùng một lượt để đội ngũ King Jades hỗ trợ khi cần.

                        </>

                      )}

                    </p>



                    <label htmlFor="destiny-unlock-phone">

                      Số điện thoại

                    </label>



                    <div className="kj-destiny-result-gate__input-row">

                      <select

                        className="kj-destiny-result-gate__country"

                        value={unlockCountryCode}

                        onChange={(event) => {

                          setUnlockCountryCode(event.target.value);

                          setUnlockPhone("");

                          setUnlockError("");

                        }}

                        aria-label="Mã quốc gia"

                        disabled={unlockLoading}

                      >

                        {PHONE_COUNTRY_OPTIONS.map((item) => (

                          <option key={item.code} value={item.code}>

                            {item.label}

                          </option>

                        ))}

                      </select>



                      <input

                        id="destiny-unlock-phone"

                        type="tel"

                        inputMode="numeric"

                        autoComplete="tel-national"

                        value={unlockPhone}

                        maxLength={unlockCountryCode === "+84" ? 9 : 15}

                        onChange={(event) => {

                          setUnlockPhone(

                            unlockCountryCode === "+84"

                              ? normalizeVietnamPhoneInput(event.target.value)

                              : event.target.value.replace(/\D/g, "").slice(0, 15)

                          );

                          setUnlockError("");

                        }}

                        onPaste={(event) => {

                          if (unlockCountryCode !== "+84") return;

                          event.preventDefault();

                          const input = event.currentTarget;

                          const start = input.selectionStart ?? 0;

                          const end = input.selectionEnd ?? input.value.length;

                          const pastedValue = event.clipboardData.getData("text");

                          setUnlockPhone(

                            normalizeVietnamPhoneInput(

                              input.value.slice(0, start) + pastedValue + input.value.slice(end)

                            )

                          );

                          setUnlockError("");

                        }}

                        placeholder={

                          unlockCountryCode === "+84"

                            ? "901191141"

                            : "Phone number"

                        }

                        disabled={unlockLoading}

                      />



                      <button type="submit" disabled={unlockLoading}>

                        {unlockLoading ? "Đang mở..." : "Xem kết quả"}

                        {!unlockLoading && <span>→</span>}

                      </button>

                    </div>



                    <span className="kj-destiny-result-gate__phone-hint">

                      {unlockCountryCode === "+84"

                        ? "Việt Nam (+84): nhập đúng 9 chữ số, bỏ số 0 đầu."

                        : "Số quốc tế: nhập từ 6 đến 15 chữ số."}

                    </span>



                    {unlockError && (

                      <div className="kj-destiny-result-gate__error">

                        {unlockError}

                      </div>

                    )}



                    <span className="kj-destiny-result-gate__privacy">

                      Thông tin chỉ dùng để tiếp nhận yêu cầu tư vấn King Jades.

                    </span>

                  </form>

                </div>

              )}

              </div>

            </div>

            </div>

          </section>

        )}

      </main>



      <Footer />

    </>

  );

};



const ElementBadge: React.FC<{

  element: ElementKey;

}> = ({ element }) => {

  const info = ELEMENTS[element];



  return (

    <span

      className="kj-destiny-element-badge"

      style={

        {

          "--element-color":

            info.color,

        } as React.CSSProperties

      }

    >

      {info.vi}

    </span>

  );

};



export default DestinyPage;