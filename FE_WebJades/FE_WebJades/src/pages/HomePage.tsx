import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { productApi } from "../api/productApi";
import { contactApi, PreferredContactChannel } from "../api/contactapi";
import { getImageUrl } from "../utils/getImageUrl";

import velvetRoyalBlue from "../assets/home/velvet-royal-blue.png";
import personalizeBg from "../assets/home/personalize-bg.png";
import consultantOriginal from "../assets/home/anhnhan2.png";
import zaloLady from "../assets/home/zalo-lady.png";
import zaloQr from "../assets/home/zalo-qr.png";
import formPattern from "../assets/home/form-pattern.svg";
import showroomHero from "../assets/home/showroom-hero-1.png";
import bachNgoc from "../assets/home/bach-ngoc.jpg";
import phiThuy from "../assets/home/phi-thuy.jpg";
import lamNgoc from "../assets/home/lam-ngoc.jpg";
import ngocBich from "../assets/home/ngoc-bich.jpg";
import sonThuy from "../assets/home/son-thuy.jpg";
import tuNham from "../assets/home/tu-nham.jpg";
import hoaDien from "../assets/home/hoa-dien.jpg";
import ngocHuyet from "../assets/home/ngoc-huyet.jpg";
import galleryBachNgoc from "../assets/home/3.png";
import galleryPhiThuy from "../assets/home/4.png";
import galleryLamNgoc from "../assets/home/5.png";
import galleryNgocBich from "../assets/home/6.png";
import gallerySonThuy from "../assets/home/8.png";
import galleryTuNham from "../assets/home/9.png";
import galleryHoaDien from "../assets/home/10.png";
import galleryNgocHuyet from "../assets/home/11.png";

import "../styles/HomePage.css";

type ProductImage = {
  url: string;
  fileName?: string;
  alt: string;
  isMain: boolean;
  sortOrder: number;
};

type HomeProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  categoryId?: string;
  categoryName: string;
  price: number;
  salePrice: number;
  shortDescription: string;
  description: string;
  images: ProductImage[];
  tags: string[];
  visibility: {
    isPublished: boolean;
    showOnMenu: boolean;
  };
  status: "active" | "draft" | "inactive";

  publishStatus?:
    | "Published"
    | "Scheduled"
    | "Draft";
};

type DestinyLeadFormState = {
  fullName: string;
  phoneCountryCode: string;
  phone: string;
  birthDate: string;
  birthTime: string;
  gender: string;
  need: string;
};

type VisualCollection = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  image: string;
};

type GalleryItem = {
  id: string;
  name: string;
  categoryName: string;
  image: string;
  slug?: string;
  shortDescription?: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  categoryId?: string;
};

type HeroMessage = {
  label: string;
  mood: string;
  title: string;
  description: string;
};

const HOME_DEFAULT_CONTACT_CHANNEL: PreferredContactChannel = "zalo";

const phoneCountryOptions = [
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

const ZaloButtonIcon = () => (
  <svg
    className="kj-zalo-action-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 3.75a8.25 8.25 0 0 0-7.1 12.45L4 20.25l4.18-1.12A8.25 8.25 0 1 0 12 3.75Z" />
    <path d="M8.25 11.4h7.5" />
  </svg>
);

const PhoneButtonIcon = () => (
  <svg
    className="kj-zalo-action-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M7.05 3.9 9.55 7.8a1.45 1.45 0 0 1-.18 1.78L8.15 10.8a14.1 14.1 0 0 0 5.05 5.05l1.22-1.22a1.45 1.45 0 0 1 1.78-.18l3.9 2.5a1.4 1.4 0 0 1 .62 1.58l-.58 2.28a1.45 1.45 0 0 1-1.41 1.09C9.77 21.9 2.1 14.23 2.1 5.27A1.45 1.45 0 0 1 3.19 3.86l2.28-.58a1.4 1.4 0 0 1 1.58.62Z" />
  </svg>
);


const homeNeedOptions = [
  "Cân bằng nội tâm",
  "Tài lộc và công việc",
  "Bình an và sức khỏe",
  "Tình duyên và gia đạo",
  "Quà tặng và sưu tầm",
];

const fallbackCollections: VisualCollection[] = [
  {
    id: "bach-ngoc",
    title: "Bạch Ngọc",
    subtitle: "Thuần Khiết · Tỉnh Tại",
    category: "Bạch Ngọc",
    image: bachNgoc,
  },
  {
    id: "phi-thuy",
    title: "Phỉ Thúy",
    subtitle: "Sâu · Sang · Nội Lực",
    category: "Phỉ Thúy",
    image: phiThuy,
  },
  {
    id: "lam-ngoc",
    title: "Lam Ngọc",
    subtitle: "Minh Định · Trí Tuệ",
    category: "Lam Ngọc",
    image: lamNgoc,
  },
  {
    id: "ngoc-bich",
    title: "Ngọc Bích",
    subtitle: "Hài Hòa · Ổn Định",
    category: "Ngọc Bích",
    image: ngocBich,
  },
  {
    id: "son-thuy",
    title: "Sơn Thủy",
    subtitle: "Độc bản · Tự nhiên",
    category: "Sơn Thủy",
    image: sonThuy,
  },
  {
    id: "tu-nham",
    title: "Tụ Nham",
    subtitle: "Tích lũy · Ổn Định",
    category: "Tụ Nham",
    image: tuNham,
  },
  {
    id: "hoa-dien",
    title: "Hòa Điền",
    subtitle: "Thanh Nhã · Chuẩn Mực",
    category: "Hòa Điền",
    image: hoaDien,
  },
  {
    id: "ngoc-huyet",
    title: "Ngọc Huyết",
    subtitle: "Sinh lực · Quyết Tâm",
    category: "Ngọc Huyết",
    image: ngocHuyet,
  },
];

// KJ Gallery phía dưới dùng bộ ảnh riêng, hoàn toàn độc lập với vòng cung hero.
// Thay ảnh/tên ở đây sẽ không ảnh hưởng logic sản phẩm của vòng cung phía trên.
const galleryCollections: VisualCollection[] = [
  {
    id: "gallery-01",
    title: "Khoảnh Khắc Gặp Gỡ",
    subtitle: "Một lựa chọn · Một dấu ấn riêng",
    category: "King Jades Moments",
    image: galleryBachNgoc,
  },
  {
    id: "gallery-02",
    title: "Niềm Vui Chọn Ngọc",
    subtitle: "Tinh tế · Tự nhiên · Riêng mình",
    category: "King Jades Moments",
    image: galleryPhiThuy,
  },
  {
    id: "gallery-03",
    title: "Duyên Ngọc Hội Ngộ",
    subtitle: "Gặp đúng ngọc · Đúng cảm xúc",
    category: "King Jades Moments",
    image: galleryLamNgoc,
  },
  {
    id: "gallery-04",
    title: "Một Ngày Tại King Jades",
    subtitle: "Trải nghiệm · Khám phá · Đồng hành",
    category: "King Jades Moments",
    image: galleryNgocBich,
  },
  {
    id: "gallery-05",
    title: "Chạm Vào Giá Trị",
    subtitle: "Vẻ đẹp bắt đầu từ cảm nhận",
    category: "King Jades Moments",
    image: gallerySonThuy,
  },
  {
    id: "gallery-06",
    title: "Khoảnh Khắc An Nhiên",
    subtitle: "Nhẹ nhàng · Bình yên · Tự tại",
    category: "King Jades Moments",
    image: galleryTuNham,
  },
  {
    id: "gallery-07",
    title: "Kỷ Niệm Cùng King Jades",
    subtitle: "Gìn giữ những khoảnh khắc đáng nhớ",
    category: "King Jades Moments",
    image: galleryHoaDien,
  },
  {
    id: "gallery-08",
    title: "Ngọc Gặp Đúng Người",
    subtitle: "Mỗi cuộc gặp · Một câu chuyện",
    category: "King Jades Moments",
    image: galleryNgocHuyet,
  },
];

const normalizeHeroKey = (value?: string) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const heroMessageDefinitions: Array<{
  aliases: string[];
  message: HeroMessage;
}> = [
  {
    aliases: ["Bạch Ngọc", "Bach Ngoc"],
    message: {
      label: "Bạch Ngọc",
      mood: "Kim · Tĩnh tại",
      title: "Khi tâm đã lặng, vạn sự tự nhiên trở nên rõ ràng.",
      description:
        "Bạch Ngọc thuần khiết, tĩnh tại và sâu lắng. Dành cho người tìm kiếm sự cân bằng nội tâm và vẻ đẹp tinh giản.",
    },
  },
  {
    aliases: ["Phỉ Thúy", "Phi Thuy"],
    message: {
      label: "Phỉ Thúy",
      mood: "Mộc · Nội lực",
      title: "Không cần chạy theo giá trị vì bản thân đã là giá trị.",
      description:
        "Phỉ Thúy sâu, sang và đầy nội lực. Dành cho người kinh doanh, đầu tư và những ai trân trọng giá trị thật.",
    },
  },
  {
    aliases: ["Lam Ngọc", "Lam Ngoc"],
    message: {
      label: "Lam Ngọc",
      mood: "Thủy · Minh định",
      title: "Khi tâm trí đã yên, mọi quyết định trở nên chính xác.",
      description:
        "Lam Ngọc trong trẻo, minh định và trí tuệ. Dành cho người cần sự tập trung, sáng suốt và bình ổn tinh thần.",
    },
  },
  {
    aliases: ["Ngọc Bích", "Ngoc Bich"],
    message: {
      label: "Ngọc Bích",
      mood: "Mộc · Hài hòa",
      title: "May mắn không đến từ ngẫu nhiên mà từ trạng thái đúng đắn bên trong.",
      description:
        "Ngọc Bích hài hòa, dễ tiếp cận và giàu cảm xúc. Dành cho người bắt đầu hành trình khám phá thế giới ngọc.",
    },
  },
  {
    aliases: ["Sơn Thủy", "Son Thuy"],
    message: {
      label: "Sơn Thủy",
      mood: "Độc bản · Tự nhiên",
      title: "Không cần giống bất kỳ ai vì bản thân vốn đã là duy nhất.",
      description:
        "Sơn Thủy độc bản trong từng đường vân. Dành cho những tâm hồn yêu sự khác biệt và dấu ấn riêng.",
    },
  },
  {
    aliases: ["Tụ Nham", "Tu Nham", "Tử Nham", "Tu Nham"],
    message: {
      label: "Tụ Nham",
      mood: "Thổ · Nền tảng",
      title: "Giá trị đích thực luôn được kiến tạo bằng thời gian và kiên nhẫn.",
      description:
        "Tụ Nham trầm ấm, vững chắc và bền bỉ. Dành cho người đang xây dựng sự nghiệp và muốn củng cố nền tảng lâu dài.",
    },
  },
  {
    aliases: ["Hòa Điền", "Hoa Điền", "Hoa Dien"],
    message: {
      label: "Hòa Điền",
      mood: "Kim · Thanh nhã",
      title: "Sang trọng thật sự — không cần phô bày để được cảm nhận.",
      description:
        "Hòa Điền tinh tế, thanh nhã và chuẩn mực. Dành cho người yêu vẻ đẹp sang trọng kín đáo.",
    },
  },
  {
    aliases: ["Ngọc Huyết", "Ngoc Huyet"],
    message: {
      label: "Ngọc Huyết",
      mood: "Hỏa · Sinh lực",
      title: "Khi năng lượng đủ mạnh, mọi thứ tự khắc vận hành thuận chiều.",
      description:
        "Ngọc Huyết sâu, ấm và đầy sinh lực. Dành cho người cần tiếp thêm động lực, sự mạnh mẽ và tinh thần dẫn dắt.",
    },
  },
];

const getHeroMessage = (item?: GalleryItem): HeroMessage => {
  if (!item) {
    return {
      label: "King Jades",
      mood: "Natural Jade",
      title: "Ngọc dành cho đúng người.",
      description:
        "Trang sức ngọc thiên nhiên cao cấp, được tuyển chọn và tư vấn theo sự tương hợp cá nhân — để mỗi lựa chọn không chỉ đẹp, mà còn đúng với hành trình của riêng bạn.",
    };
  }

  const candidates = [item.categoryName, item.name]
    .map(normalizeHeroKey)
    .filter(Boolean);

  const found = heroMessageDefinitions.find(({ aliases }) => {
    const normalizedAliases = aliases.map(normalizeHeroKey);

    return candidates.some((candidate) =>
      normalizedAliases.some(
        (alias) => candidate === alias || candidate.includes(alias)
      )
    );
  });

  if (found) {
    return found.message;
  }

  return {
    label: item.categoryName || item.name || "King Jades",
    mood: "Natural Jade",
    title: item.name || "Ngọc dành cho đúng người.",
    description:
      item.shortDescription ||
      "Mỗi món ngọc được chọn để phù hợp với gu thẩm mỹ, nhu cầu sử dụng và hành trình riêng của người sở hữu.",
  };
};


const getGalleryImageByCategory = (categoryName?: string) => {
  const key = normalizeHeroKey(categoryName);

  return (
    galleryCollections.find(
      (item) => normalizeHeroKey(item.category) === key
    )?.image || ""
  );
};

const buildMarqueeRow = (
  items: GalleryItem[],
  startIndex: number,
  rowSize = 4
) => {
  if (items.length === 0) {
    return [];
  }

  return Array.from({ length: rowSize }, (_, index) => {
    return items[(startIndex + index) % items.length];
  });
};

const energyCards = [
  {
    number: "01",
    eyebrow: "Giá trị lượng",
    title: "Chất lượng tinh tuyển",
    text: "Mỗi phẩm ngọc được chọn theo chất ngọc, màu sắc, kết cấu và độ hoàn thiện để giữ giá trị lâu dài.",
  },
  {
    number: "02",
    eyebrow: "Giá trị nhân hóa",
    title: "Tư vấn đúng người",
    text: "Mỗi khách hàng mang một trạng thái năng lượng và câu chuyện riêng. King Jades ưu tiên trải nghiệm tư vấn 1:1.",
  },
  {
    number: "03",
    eyebrow: "Giá trị vọng",
    title: "Giá trị truyền đời",
    text: "Thiết kế không chạy theo xu hướng ngắn hạn, mà lưu giữ giá trị tinh thần, thẩm mỹ và chiều sâu.",
  },
];

const getProductImage = (product: HomeProduct) => {
  const image = product.images?.find((item) => item.isMain) || product.images?.[0];
  return image?.url ? getImageUrl(image.url) : "";
};

const isHeroFeaturedProduct = (
  product: HomeProduct
) => {
  const tagText =
    (product.tags || [])
      .join(" ")
      .toLowerCase();

  return (
    product.tags?.some(
      (tag) =>
        tag.toLowerCase() === "featured" ||
        tag.toLowerCase() === "home" ||
        tag.toLowerCase() === "noi bat" ||
        tag.toLowerCase() === "nổi bật"
    ) ||
    tagText.includes("featured") ||
    tagText.includes("home") ||
    tagText.includes("noi bat") ||
    tagText.includes("nổi bật")
  );
};
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [activeHeroId, setActiveHeroId] = useState<string | null>(null);
  const [heroTapPreviewItem, setHeroTapPreviewItem] =
    useState<GalleryItem | null>(null);
  const heroTapNavigateTimerRef = useRef<number | null>(null);
  const guidanceSectionRef = useRef<HTMLElement | null>(null);

  const [destinyLeadForm, setDestinyLeadForm] = useState<DestinyLeadFormState>({
    fullName: "",
    phoneCountryCode: "+84",
    phone: "",
    birthDate: "",
    birthTime: "",
    gender: "Không chọn / không bắt buộc",
    need: "Cân bằng nội tâm",
  });

  const [destinyLeadLoading, setDestinyLeadLoading] = useState(false);
  const [destinyLeadError, setDestinyLeadError] = useState("");
  const [destinyLeadSuccess, setDestinyLeadSuccess] = useState("");
  const [showDestinyThankYou, setShowDestinyThankYou] = useState(false);

  useEffect(() => {
    return () => {
      if (heroTapNavigateTimerRef.current !== null) {
        window.clearTimeout(heroTapNavigateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let fetching = false;

    const fetchProducts = async () => {
      // Không gửi chồng request nếu lần tải trước chưa xong.
      if (!mounted || fetching) return;
      fetching = true;

      try {
        const data = await productApi.getPublicProductsPaged({
          page: 1,
          pageSize: 8,
          sort: "newest",
        });

        if (mounted) {
          // PublicProductListItem không chứa visibility/publishStatus.
          // Dùng trực tiếp danh sách từ API public; trạng thái xuất bản do API lọc.
          const publicProducts: HomeProduct[] = (data.products || [])
            .map((product) => ({
              id: product.id,
              name: product.name,
              slug: product.slug,
              sku: product.sku || "",
              parentCategoryId: product.parentCategoryId,
              parentCategoryName: product.parentCategoryName || "",
              categoryId: product.categoryId,
              categoryName: product.categoryName || "",
              price: product.price || 0,
              salePrice: product.salePrice || 0,
              shortDescription: product.shortDescription || "",
              // Giữ mapping phù hợp với giao diện HomePage hiện tại.
              description: product.shortDescription || "",
              images: product.mainImage
                ? [
                    {
                      url: product.mainImage,
                      alt: product.name,
                      isMain: true,
                      sortOrder: 0,
                    },
                  ]
                : [],
              tags: [],
              visibility: {
                isPublished: true,
                showOnMenu: false,
              },
              status: "active",
              publishStatus: "Published",
            }));

          setProducts(publicProducts);
        }
      } catch {
        // Giữ danh sách hiện tại khi API lỗi để tránh nhấp nháy giao diện.
      } finally {
        fetching = false;
      }
    };

    // Tải ngay khi vào trang, sau đó cập nhật mỗi 30 giây.
    void fetchProducts();
    const timer = window.setInterval(() => {
      void fetchProducts();
    }, 30_000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const section = guidanceSectionRef.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const clamp01 = (value: number) =>
      Math.max(0, Math.min(1, value));

    const segment = (
      progress: number,
      start: number,
      end: number
    ) => clamp01((progress - start) / (end - start));

    const easeOutCubic = (value: number) =>
      1 - Math.pow(1 - value, 3);

    let ticking = false;

    const setStage = (
      name: string,
      value: number,
      fromX: number,
      fromY: number,
      fromScale = 0.94,
      minOpacity = 0
    ) => {
      const eased = easeOutCubic(value);
      const revealOpacity = clamp01(value * 1.25);
      const opacity =
        minOpacity + (1 - minOpacity) * revealOpacity;

      section.style.setProperty(
        `--guidance-${name}-opacity`,
        String(opacity)
      );
      section.style.setProperty(
        `--guidance-${name}-x`,
        `${fromX * (1 - eased)}px`
      );
      section.style.setProperty(
        `--guidance-${name}-y`,
        `${fromY * (1 - eased)}px`
      );
      section.style.setProperty(
        `--guidance-${name}-scale`,
        String(fromScale + (1 - fromScale) * eased)
      );
    };

    const updateGuidanceReveal = () => {
      if (reducedMotion.matches) {
        [
          "portrait",
          "note1",
          "note2",
          "note3",
          "copy",
        ].forEach((name) => {
          section.style.setProperty(
            `--guidance-${name}-opacity`,
            "1"
          );
          section.style.setProperty(
            `--guidance-${name}-x`,
            "0px"
          );
          section.style.setProperty(
            `--guidance-${name}-y`,
            "0px"
          );
          section.style.setProperty(
            `--guidance-${name}-scale`,
            "1"
          );
        });

        ticking = false;
        return;
      }

      const viewportHeight = window.innerHeight || 1;
      const rect = section.getBoundingClientRect();
      const sectionTop = rect.top + window.scrollY;
      const sectionHeight = section.offsetHeight;

      const animationStart = sectionTop;
      const animationEnd = Math.max(
        animationStart + 1,
        sectionTop + sectionHeight - viewportHeight
      );

      /*
        Dùng scrollY thật của document:
        - vừa chạm section => progress = 0
        - cuộn xuyên hết vùng sticky => progress = 1

        Cách này tránh trường hợp section nhìn như đứng yên
        hoặc progress nhảy hết ngay từ đầu.
      */
      const progress = clamp01(
        (window.scrollY - animationStart) /
          (animationEnd - animationStart)
      );

      setStage(
        "portrait",
        segment(progress, 0.06, 0.28),
        0,
        140,
        0.82,
        0.22
      );

      setStage(
        "note1",
        segment(progress, 0.24, 0.44),
        -145,
        38,
        0.86
      );

      setStage(
        "note2",
        segment(progress, 0.40, 0.60),
        145,
        34,
        0.86
      );

      setStage(
        "note3",
        segment(progress, 0.54, 0.74),
        125,
        52,
        0.88
      );

      setStage(
        "copy",
        segment(progress, 0.70, 0.94),
        -70,
        82,
        0.90
      );

      ticking = false;
    };

    const requestGuidanceReveal = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateGuidanceReveal);
        ticking = true;
      }
    };

    updateGuidanceReveal();

    window.addEventListener(
      "scroll",
      requestGuidanceReveal,
      { passive: true }
    );
    window.addEventListener(
      "resize",
      requestGuidanceReveal
    );

    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener(
        "change",
        requestGuidanceReveal
      );
    }

    return () => {
      window.removeEventListener(
        "scroll",
        requestGuidanceReveal
      );
      window.removeEventListener(
        "resize",
        requestGuidanceReveal
      );

      if (reducedMotion.removeEventListener) {
        reducedMotion.removeEventListener(
          "change",
          requestGuidanceReveal
        );
      }
    };
  }, []);

  const naturalCollectionProducts = useMemo(() => {
    const hasHierarchy =
      products.some(
        (product) =>
          Boolean(
            product.parentCategoryName?.trim()
          )
      );

    if (!hasHierarchy) {
      // Tương thích sản phẩm cũ trước khi migrate category tree.
      return products;
    }

    return products.filter(
      (product) =>
        product.parentCategoryName ===
        "Vòng Ngọc Thiên Nhiên"
    );
  }, [products]);

  const heroItems = useMemo<GalleryItem[]>(() => {
    const manuallyFeatured =
      naturalCollectionProducts.filter(
        isHeroFeaturedProduct
      );

    const source =
      manuallyFeatured.length > 0
        ? manuallyFeatured
        : naturalCollectionProducts;

    if (source.length > 0) {
      return source.slice(0, 8).map((product) => ({
        id: product.id,
        name: product.name,
        categoryName: product.categoryName || "King Jades",
        image: getProductImage(product),
        slug: product.slug,
        shortDescription: product.shortDescription,
        parentCategoryId:
          product.parentCategoryId || "vong-ngoc-thien-nhien",
        parentCategoryName:
          product.parentCategoryName || "Vòng Ngọc Thiên Nhiên",
        categoryId: product.categoryId,
      }));
    }

    return fallbackCollections.map((item) => ({
      id: item.id,
      name: item.title,
      categoryName: item.category,
      image: item.image,
      shortDescription: item.subtitle,
    }));
  }, [naturalCollectionProducts]);

  const activeHeroItem = useMemo(() => {
    if (heroItems.length === 0) {
      return undefined;
    }

    return (
      heroItems.find((item) => item.id === activeHeroId) ||
      heroItems[0]
    );
  }, [activeHeroId, heroItems]);

  const activeHeroMessage = useMemo(
    () => getHeroMessage(activeHeroItem),
    [activeHeroItem]
  );
  const heroTapPreviewMessage = useMemo(
    () => getHeroMessage(heroTapPreviewItem || undefined),
    [heroTapPreviewItem]
  );
  const fallbackHeroCategoryIdMap: Record<string, string> = {
    "Bạch Ngọc": "vong-bach-ngoc",
    "Phỉ Thúy": "vong-ngoc-phi-thuy",
    "Lam Ngọc": "vong-lam-ngoc",
    "Ngọc Bích": "vong-ngoc-bich",
    "Sơn Thủy": "vong-ngoc-son-thuy",
    "Tụ Nham": "vong-ngoc-tu-nham",
    "Hòa Điền": "vong-ngoc-hoa-dien",
    "Ngọc Huyết": "vong-ngoc-huyet",
  };
  const buildHeroCategoryUrl = (item: GalleryItem) => {
    const params = new URLSearchParams();
    const parentCategoryId =
      item.parentCategoryId || "vong-ngoc-thien-nhien";
    const parentCategoryName =
      item.parentCategoryName || "Vòng Ngọc Thiên Nhiên";
    const categoryId =
      item.categoryId || fallbackHeroCategoryIdMap[item.categoryName] || "";
    params.set("parentCategoryId", parentCategoryId);
    params.set("parentCategory", parentCategoryName);
    if (categoryId) {
      params.set("categoryId", categoryId);
    }
    if (item.categoryName) {
      params.set("category", item.categoryName);
    }
    return `/products?${params.toString()}`;
  };
  // Logic bản 2: sản phẩm thật mở trang chi tiết theo slug.
  // Giữ liên kết danh mục của bản 1 cho các thẻ ảnh dự phòng.
  const buildHeroItemUrl = (item: GalleryItem) =>
    item.slug ? `/products/${item.slug}` : buildHeroCategoryUrl(item);

  const handleHeroItemClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    item: GalleryItem
  ) => {
    // Giữ thao tác mở tab mới bằng Ctrl/Cmd/Shift như liên kết thông thường.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const destinationUrl = buildHeroItemUrl(item);
    const shouldPreviewBeforeNavigate =
      window.matchMedia(
        "(max-width: 760px), (hover: none) and (pointer: coarse)"
      ).matches;
    if (!shouldPreviewBeforeNavigate) {
      return;
    }
    event.preventDefault();
    setActiveHeroId(item.id);
    setHeroTapPreviewItem(item);
    if (heroTapNavigateTimerRef.current !== null) {
      window.clearTimeout(heroTapNavigateTimerRef.current);
    }
    heroTapNavigateTimerRef.current = window.setTimeout(() => {
      setHeroTapPreviewItem(null);
      heroTapNavigateTimerRef.current = null;
      navigate(destinationUrl);
    }, 1400);
  };

  const galleryItems = useMemo<GalleryItem[]>(
    () =>
      galleryCollections.map((item) => ({
        id: item.id,
        name: item.title,
        categoryName: item.category,
        image: item.image,
        shortDescription: item.subtitle,
      })),
    []
  );

  const galleryMarqueeRows = useMemo(() => {
    if (galleryItems.length === 0) {
      return {
        top: [] as GalleryItem[],
        bottom: [] as GalleryItem[],
      };
    }

    const bottomStart = galleryItems.length > 4 ? 4 : 0;

    return {
      top: buildMarqueeRow(galleryItems, 0, 4),
      bottom: buildMarqueeRow(galleryItems, bottomStart, 4),
    };
  }, [galleryItems]);

  const renderGalleryMarqueeCard = (
    item: GalleryItem,
    key: string,
    isClone: boolean
  ) => {
    const fallbackImage = getGalleryImageByCategory(item.categoryName);

    const visual = (
      <>
        {item.image ? (
          <img
            src={item.image}
            alt={isClone ? "" : item.name}
            onError={(event) => {
              if (
                fallbackImage &&
                event.currentTarget.src !== fallbackImage
              ) {
                event.currentTarget.src = fallbackImage;
              }
            }}
          />
        ) : fallbackImage ? (
          <img
            src={fallbackImage}
            alt={isClone ? "" : item.name}
          />
        ) : (
          <div className="kj-gallery-marquee__placeholder">KJ</div>
        )}

        <span className="kj-gallery-marquee__shade" />

        <div className="kj-gallery-marquee__caption">
          <small>{item.categoryName}</small>
          <strong>{item.name}</strong>
        </div>
      </>
    );

    if (item.slug) {
      return (
        <Link
          className="kj-gallery-marquee__card"
          key={key}
          to={`/products/${item.slug}`}
          tabIndex={isClone ? -1 : undefined}
          aria-hidden={isClone ? true : undefined}
        >
          {visual}
        </Link>
      );
    }

    return (
      <article
        className="kj-gallery-marquee__card"
        key={key}
        aria-hidden={isClone ? true : undefined}
      >
        {visual}
      </article>
    );
  };


  const updateDestinyLeadField = (
    field: keyof DestinyLeadFormState,
    value: string
  ) => {
    setDestinyLeadForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleDestinyLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const fullName = destinyLeadForm.fullName.trim();
    const phoneCountryCode = destinyLeadForm.phoneCountryCode;
    const phone = destinyLeadForm.phone.replace(/\D/g, "");

    if (!fullName) {
      setDestinyLeadError("Vui lòng nhập họ tên.");
      return;
    }

    if (!phone) {
      setDestinyLeadError("Vui lòng nhập số điện thoại.");
      return;
    }

    if (
      phoneCountryCode === "+84" &&
      !/^[1-9]\d{8}$/.test(phone)
    ) {
      setDestinyLeadError(
        "Số điện thoại Việt Nam (+84) phải gồm đúng 9 chữ số, không có số 0 ở đầu."
      );
      return;
    }

    if (
      phoneCountryCode !== "+84" &&
      !/^\d{6,15}$/.test(phone)
    ) {
      setDestinyLeadError(
        "Số điện thoại quốc tế phải gồm từ 6 đến 15 chữ số."
      );
      return;
    }

    const fullPhone = `${phoneCountryCode}${phone}`;

    if (!destinyLeadForm.birthDate) {
      setDestinyLeadError(
        "Vui lòng chọn ngày tháng năm sinh để xem mệnh."
      );
      return;
    }

    const message = [
      destinyLeadForm.birthDate
        ? `Ngày sinh: ${destinyLeadForm.birthDate}`
        : "Ngày sinh: chưa cung cấp",
      destinyLeadForm.birthTime
        ? `Giờ sinh: ${destinyLeadForm.birthTime}`
        : "Giờ sinh: chưa cung cấp",
      `Giới tính: ${destinyLeadForm.gender}`,
      `Mong muốn chính: ${destinyLeadForm.need}`,
    ].join("\n");

    try {
      setDestinyLeadLoading(true);
      setDestinyLeadError("");
      setDestinyLeadSuccess("");

      const data = await contactApi.createContactLead({
        fullName,
        phone: fullPhone,
        email: "",
        need: "Chọn ngọc theo bản mệnh",
        preferredContactChannel: HOME_DEFAULT_CONTACT_CHANNEL,
        message,
        productId: "",
        productName: "",
        productSlug: "",
        source: "home_page_fengshui",
      });

      setDestinyLeadSuccess(
        data.message ||
          "King Jades đã nhận thông tin. Đang chuyển sang trang xem mệnh..."
      );
      // Hiện popup cảm ơn trước khi chuyển sang trang Mệnh Khuyết.
      setShowDestinyThankYou(true);

      const destinyGender:
        | "any"
        | "male"
        | "female" =
        destinyLeadForm.gender === "Nam"
          ? "male"
          : destinyLeadForm.gender === "Nữ"
            ? "female"
            : "any";

      /*
        Luồng mới:
        1. contactApi.createContactLead() đã chạy thành công
           => thông tin vẫn được lưu/gửi về Admin Liên hệ.
        2. Chuyển sang DestinyPage bằng router state.
        3. DestinyPage nhận dữ liệu và tự tính kết quả ngay.
      */
      // Cho khách đủ thời gian đọc lời cảm ơn rồi mới chuyển trang.
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 1500);
      });
      navigate("/xem-menh", {
        state: {
          fromHomeDestiny: true,
          autoCalculate: true,
          phoneCountryCode,
          phone,
          destinyForm: {
            fullName,
            birthDate: destinyLeadForm.birthDate,
            birthTime: destinyLeadForm.birthTime,
            gender: destinyGender,
          },
        },
      });
    } catch (error) {
      const apiError = error as Error;
      setDestinyLeadError(
        apiError.message || "Không thể gửi yêu cầu tư vấn lúc này."
      );
    } finally {
      setDestinyLeadLoading(false);
    }
  };

  return (
    <>
      <Header />

      <div className="kj-home">
        {showDestinyThankYou && (
          <div
            className="kj-home-thankyou"
            role="dialog"
            aria-modal="true"
            aria-live="polite"
            aria-label="Cảm ơn quý khách"
          >
            <div className="kj-home-thankyou__backdrop" />
            <div className="kj-home-thankyou__card">
              <div className="kj-home-thankyou__icon" aria-hidden="true">
                ✓
              </div>
              <span>King Jades</span>
              <h3>Xin cảm ơn Quý khách</h3>
              <p>
                King Jades đã nhận thông tin của Quý khách.
                Hệ thống đang chuyển sang phần Mệnh Khuyết để xem kết quả.
              </p>
              <div className="kj-home-thankyou__loading" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        )}
        <main>
        <section
  className="kj-brand-hero"
  style={{
    backgroundImage: `
      linear-gradient(
        rgba(20, 37, 67, 0.90),
        rgba(20, 37, 67, 0.90)
      ),
      url(${showroomHero})
    `,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  }}
>
          <div className="kj-brand-hero__glow kj-brand-hero__glow--left" />
          <div className="kj-brand-hero__glow kj-brand-hero__glow--right" />

          <div className="kj-hero-orbit" aria-label="Bộ sưu tập nổi bật King Jades">
            {heroItems.map((item, index) => {
              const isActive = activeHeroItem?.id === item.id;

              const cardClassName = [
                "kj-hero-orbit__card",
                `kj-hero-orbit__card--${index + 1}`,
                isActive ? "is-active" : "is-dimmed",
              ]
                .filter(Boolean)
                .join(" ");

              const body = (
                <>
                  <div className="kj-hero-orbit__image">
                    {item.image ? (
                      <img src={item.image} alt={item.name} />
                    ) : (
                      <span>KJ</span>
                    )}
                  </div>
                  <div className="kj-hero-orbit__meta">
                    <strong>{item.name}</strong>
                    <small>{item.shortDescription || item.categoryName}</small>
                  </div>
                </>
              );

              const interactionProps = {
                onMouseEnter: () => setActiveHeroId(item.id),
                onFocus: () => setActiveHeroId(item.id),
                onClick: (event: React.MouseEvent<HTMLAnchorElement>) =>
                  handleHeroItemClick(event, item),
              };

              return (
                <Link
                  key={item.id}
                  className={cardClassName}
                  to={buildHeroItemUrl(item)}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={
                    item.slug
                      ? `Xem sản phẩm ${item.name}`
                      : `Xem danh mục ${item.categoryName}`
                  }
                  {...interactionProps}
                >
                  {body}
                </Link>
              );
            })}
          </div>
          {heroTapPreviewItem && (
            <div
              className="kj-hero-tap-preview"
              role="status"
              aria-live="polite"
            >
              <div className="kj-hero-tap-preview__card">
                <span className="kj-hero-tap-preview__eyebrow">
                  {heroTapPreviewMessage.label} · {heroTapPreviewMessage.mood}
                </span>
                <strong>{heroTapPreviewMessage.title}</strong>
                <p>{heroTapPreviewMessage.description}</p>
                <small>
                  {heroTapPreviewItem.slug
                    ? `Đang mở sản phẩm ${heroTapPreviewItem.name}…`
                    : `Đang mở danh mục ${heroTapPreviewItem.categoryName}…`}
                </small>
              </div>
            </div>
          )}

          <div
            className="kj-brand-hero__content"
            key={activeHeroItem?.id || "default-hero"}
          >
            <span className="kj-brand-pill">
              <i /> {activeHeroMessage.label} · {activeHeroMessage.mood}
            </span>

            <h1>{activeHeroMessage.title}</h1>

            <p>{activeHeroMessage.description}</p>

            <div className="kj-brand-hero__actions">
              <Link
                className="kj-brand-button kj-brand-button--gold"
                to="/xem-menh"
              >
                Xem ngọc hợp mệnh
              </Link>
              <Link className="kj-brand-button kj-brand-button--light" to="/products">
                Khám phá dòng ngọc
              </Link>
            </div>
          </div>
        </section>

        <section
          id="fengshui"
          className="kj-mind-section"
          style={{
            backgroundImage: `linear-gradient(rgba(6, 19, 48, 0.64), rgba(6, 19, 48, 0.78)), url(${velvetRoyalBlue})`,
          }}
        >
          <img className="kj-mind-section__pattern" src={formPattern} alt="" />

          <div className="kj-mind-section__inner">
            <div className="kj-mind-section__copy">
              <span className="kj-gold-eyebrow">Tinh thần tuyển ngọc</span>
              <h2>Thân – Tâm – Trí</h2>
              <p>
                Một tác phẩm ngọc quý không chỉ tôn vinh vẻ đẹp bề ngoài, mà còn
                phản chiếu trật tự bên trong: <strong>Thân</strong> trong phong thái,
                <strong>Tâm</strong> trong an định, <strong>Trí</strong> trong sáng rõ.
                Khi ba giá trị ấy hài hòa, vẻ đẹp không còn là sự phô diễn, mà trở
                thành khí chất.
              </p>

              <ul>
                <li>Thân trong phong thái</li>
                <li>Tâm trong an định</li>
                <li>Trí trong sáng rõ</li>
              </ul>
            </div>

            <form className="kj-home-destiny-form" onSubmit={handleDestinyLeadSubmit}>
              <div className="kj-home-destiny-form__topline">
                <div>
                  <span className="kj-gold-eyebrow">Tư vấn bản mệnh</span>
                  <h3>Xem ngọc hợp mệnh</h3>
                </div>

              </div>

              <p>
                Nhập thông tin để nhận gợi ý dòng ngọc nên bắt đầu: Bạch Ngọc,
                Phỉ Thúy, Lam Ngọc, Ngọc Bích, Sơn Thủy, Tụ Nham, Hòa Điền hoặc
                Ngọc Huyết.
              </p>

              {destinyLeadSuccess && (
                <div className="kj-home-destiny-alert kj-home-destiny-alert--success">
                  {destinyLeadSuccess}
                </div>
              )}

              {destinyLeadError && (
                <div className="kj-home-destiny-alert kj-home-destiny-alert--error">
                  {destinyLeadError}
                </div>
              )}

              <div className="kj-home-destiny-form__grid">
                <label className="kj-home-destiny-form__field">
                  <span>Họ tên</span>
                  <input
                    value={destinyLeadForm.fullName}
                    onChange={(event) =>
                      updateDestinyLeadField("fullName", event.target.value)
                    }
                    placeholder="Nhập họ tên"
                  />
                </label>

                <label className="kj-home-destiny-form__field">
                  <span>Số điện thoại</span>

                  <div className="kj-home-destiny-phone">
                    <select
                      className="kj-home-destiny-phone__code"
                      value={destinyLeadForm.phoneCountryCode}
                      onChange={(event) => {
                        updateDestinyLeadField(
                          "phoneCountryCode",
                          event.target.value
                        );

                        updateDestinyLeadField(
                          "phone",
                          event.target.value === "+84"
                            ? normalizeVietnamPhoneInput(destinyLeadForm.phone)
                            : destinyLeadForm.phone.replace(/\D/g, "")
                        );

                        setDestinyLeadError("");
                      }}
                      aria-label="Mã quốc gia"
                    >
                      {phoneCountryOptions.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <input
                      className="kj-home-destiny-phone__number"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={destinyLeadForm.phone}
                      maxLength={
                        destinyLeadForm.phoneCountryCode === "+84"
                          ? 9
                          : 15
                      }
                      onChange={(event) => {
                        updateDestinyLeadField(
                          "phone",
                          destinyLeadForm.phoneCountryCode === "+84"
                            ? normalizeVietnamPhoneInput(event.target.value)
                            : event.target.value.replace(/\D/g, "").slice(0, 15)
                        );

                        setDestinyLeadError("");
                      }}
                      onPaste={(event) => {
                        if (destinyLeadForm.phoneCountryCode !== "+84") return;
                        event.preventDefault();
                        const input = event.currentTarget;
                        const start = input.selectionStart ?? 0;
                        const end = input.selectionEnd ?? input.value.length;
                        const pastedValue = event.clipboardData.getData("text");
                        updateDestinyLeadField(
                          "phone",
                          normalizeVietnamPhoneInput(
                            input.value.slice(0, start) + pastedValue + input.value.slice(end)
                          )
                        );
                        setDestinyLeadError("");
                      }}
                      placeholder={
                        destinyLeadForm.phoneCountryCode === "+84"
                          ? "901191141"
                          : "Phone number"
                      }
                    />
                  </div>

                  <small className="kj-home-destiny-phone__hint">
                    {destinyLeadForm.phoneCountryCode === "+84"
                      ? "Việt Nam (+84): nhập đúng 9 chữ số, bỏ số 0 đầu."
                      : "Số quốc tế: nhập từ 6 đến 15 chữ số."}
                  </small>
                </label>

                <label className="kj-home-destiny-form__field">
                  <span>Ngày tháng năm sinh</span>
                  <input
                    type="date"
                    required
                    value={destinyLeadForm.birthDate}
                    onChange={(event) =>
                      updateDestinyLeadField("birthDate", event.target.value)
                    }
                  />
                </label>

                <label className="kj-home-destiny-form__field">
                  <span>Giờ sinh</span>
                  <input
                    type="time"
                    value={destinyLeadForm.birthTime}
                    onChange={(event) =>
                      updateDestinyLeadField("birthTime", event.target.value)
                    }
                  />
                </label>

                <label className="kj-home-destiny-form__field">
                  <span>Giới tính</span>
                  <select
                    value={destinyLeadForm.gender}
                    onChange={(event) =>
                      updateDestinyLeadField("gender", event.target.value)
                    }
                  >
                    <option>Không chọn / không bắt buộc</option>
                    <option>Nữ</option>
                    <option>Nam</option>
                    <option>Khác</option>
                  </select>
                </label>

                <label className="kj-home-destiny-form__field">
                  <span>Mong muốn chính</span>
                  <select
                    value={destinyLeadForm.need}
                    onChange={(event) =>
                      updateDestinyLeadField("need", event.target.value)
                    }
                  >
                    {homeNeedOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button type="submit" disabled={destinyLeadLoading}>
                {destinyLeadLoading ? "Đang gửi..." : "Xem Ngũ Hành Của Tôi →"}
              </button>

            
            </form>
          </div>
        </section>

        <section
          ref={guidanceSectionRef}
          id="about"
          className="kj-guidance-section kj-guidance-section--scroll-reveal"
          style={{ backgroundImage: `url(${personalizeBg})` }}
        >
          <div className="kj-guidance-section__inner">
            <span className="kj-brand-pill kj-brand-pill--soft">Chuyên gia tư vấn</span>


            <div className="kj-guidance-section__portrait">
              <img src={consultantOriginal} alt="Chuyên gia tư vấn King Jades" />

              <aside className="kj-advisor-note kj-advisor-note--one">
                <small>King Jades</small>
                <p>Chọn ngọc dựa trên gu thẩm mỹ, nhu cầu sử dụng và trạng thái năng lượng.</p>
              </aside>

              <aside className="kj-advisor-note kj-advisor-note--two">
                <small>Advisor</small>
                <p>Tư vấn đúng 1:1 cho hành trình chọn ngọc lâu dài, không chạy theo số đông.</p>
              </aside>

              <aside className="kj-advisor-note kj-advisor-note--three">
                <small>Philosophy</small>
                <p>Bạn sở hữu giá trị vì hiểu rõ điều phù hợp với mình.</p>
              </aside>
            </div>

            <div className="kj-guidance-section__copy">
              <p>
                Tư vấn chọn ngọc theo ngày sinh, nhu cầu và hành trình cá nhân —
                giúp bạn cảm thấy an tâm hơn trước khi chọn chiếc vòng phù hợp.
              </p>
              <Link to="/contact" className="kj-brand-button kj-brand-button--navy">
                Đặt lịch tư vấn →
              </Link>
            </div>
          </div>
        </section>

        <section className="kj-energy-section">
          <div className="kj-energy-section__inner">
            <header className="kj-energy-section__heading">
              <h2>Mỗi dòng ngọc là một trạng thái năng lượng khác nhau.</h2>
              <p>
                King Jades chỉ bắt đầu từ ba giá trị đích thực: phẩm chất nền
                tảng, sự phù hợp đúng người và giá trị truyền đời.
              </p>
            </header>

            <div className="kj-energy-section__cards">
              {energyCards.map((card) => (
                <article key={card.number}>
                  <span>{card.number} · {card.eyebrow}</span>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="products" className="kj-gallery-section">
          <div className="kj-gallery-section__inner">
            <header className="kj-gallery-section__heading">
              <span className="kj-gold-eyebrow">DẤU ẤN KING JADES</span>
              <h2>
                Vòng ngọc trên tay. Chất ngọc thật.
                <br />
                 Cảm giác thật.
              </h2>
            </header>

            <div
              className="kj-gallery-marquee"
              aria-label="Bộ sưu tập vòng ngọc King Jades"
            >
              <div className="kj-gallery-marquee__row kj-gallery-marquee__row--left">
                {[0, 1].map((copyIndex) => (
                  <div
                    className="kj-gallery-marquee__set"
                    key={`top-set-${copyIndex}`}
                    aria-hidden={copyIndex === 1 ? true : undefined}
                  >
                    {galleryMarqueeRows.top.map((item, index) =>
                      renderGalleryMarqueeCard(
                        item,
                        `top-${copyIndex}-${item.id}-${index}`,
                        copyIndex === 1
                      )
                    )}
                  </div>
                ))}
              </div>

              <div className="kj-gallery-marquee__row kj-gallery-marquee__row--right">
                {[0, 1].map((copyIndex) => (
                  <div
                    className="kj-gallery-marquee__set"
                    key={`bottom-set-${copyIndex}`}
                    aria-hidden={copyIndex === 1 ? true : undefined}
                  >
                    {galleryMarqueeRows.bottom.map((item, index) =>
                      renderGalleryMarqueeCard(
                        item,
                        `bottom-${copyIndex}-${item.id}-${index}`,
                        copyIndex === 1
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="kj-gallery-section__footer">
              <Link
                to="/products?parentCategory=Vòng%20Ngọc%20Thiên%20Nhiên"
                className="kj-brand-button kj-brand-button--outline-light"
              >
                KHÁM PHÁ BỘ SƯU TẬP
              </Link>
            </div>
          </div>
        </section>

        <section
          className="kj-zalo-section"
          style={{ backgroundImage: `url(${zaloLady})` }}
        >
          <div className="kj-zalo-section__overlay" />
          <div className="kj-zalo-section__inner">
            <div className="kj-zalo-section__copy">
              <span className="kj-gold-eyebrow">Kết nối cùng KingJades</span>
              <h2>Kết nối Zalo OA để được tư vấn nhanh chóng.</h2>


              <ul>
                <li>Tư vấn trực tiếp qua Zalo</li>
                <li>Cập nhật bộ sưu tập và ưu đãi</li>
                <li>Hỗ trợ đặt lịch nhanh</li>
              </ul>

              <div className="kj-zalo-section__actions">
                <a
                  href="https://zalo.me/3354373045960365130"
                  target="_blank"
                  rel="noreferrer"
                  className="kj-brand-button kj-brand-button--blue"
                >
                  <ZaloButtonIcon />
                  <span>Kết nối Zalo OA</span>
                </a>
                <a
                  className="kj-brand-button kj-brand-button--gold"
                  href="tel:0901191141"
                >
                  <PhoneButtonIcon />
                  <span>0901 191 141</span>
                </a>
              </div>
            </div>

            <div className="kj-zalo-section__qr">
              <img src={zaloQr} alt="QR Zalo Official Account King Jades" />
              <strong>Quét mã để kết nối</strong>
              <small>Zalo Official Account · KingJades</small>
            </div>
          </div>
        </section>
        </main>
      </div>

      <Footer />
    </>
  );
};

export default HomePage;