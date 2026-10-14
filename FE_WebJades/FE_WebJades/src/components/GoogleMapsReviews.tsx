import React, { useEffect, useRef, useState } from "react";
import apiClient from "../api/apiClient";
import "../styles/GoogleMapsReviews.css";

// Place/URL nay duoc cung cap boi King Jades. Khong phai Place ID cua Places API.
const GOOGLE_MAPS_URL =
  "https://maps.app.goo.gl/YRM9kbJVrJZLJUH66";

type GoogleReview = {
  id: string;
  rating: number;
  text: string;
  publishedAt?: string | null;
  relativeTime?: string | null;
  authorName: string;
  authorUrl?: string | null;
  authorPhotoUrl?: string | null;
  reviewUrl?: string | null;
};

type GoogleReviewsPayload = {
  placeName?: string;
  rating?: number | null;
  userRatingCount?: number | null;
  googleMapsUri?: string | null;
  reviews?: GoogleReview[];
};

const safeExternalUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
};

const ReviewStars: React.FC<{ rating: number }> = ({ rating }) => (
  <span className="kj-gr-stars" aria-label={`${rating} trên 5 sao`}>
    {Array.from({ length: 5 }, (_, index) => (
      <span
        key={index}
        className={index < Math.round(rating) ? "is-filled" : ""}
        aria-hidden="true"
      >
        ★
      </span>
    ))}
  </span>
);

const GoogleMapsReviews: React.FC = () => {
  const [data, setData] = useState<GoogleReviewsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    let alive = true;
    const load = async () => {
      try {
        const response = await apiClient.get<GoogleReviewsPayload>(
          "/api/public/google-reviews"
        );
        if (alive) setData(response.data);
      } catch {
        // API key chua cau hinh / Places API tam thoi loi:
        // giu CTA Google Maps, khong hien rating hay review gia.
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    return () => { alive = false; };
  }, [isMobile]);

  const reviews = (data?.reviews || []).filter((review) => Boolean(review.text?.trim()));
  const mapsHref = GOOGLE_MAPS_URL;

  const slide = (direction: number) => {
    const container = trackRef.current;
    if (!container) return;
    const card = container.querySelector<HTMLElement>(".kj-gr-card");
    const step = card?.getBoundingClientRect().width || container.clientWidth;
    const gap = 18;
    container.scrollBy({ left: (step + gap) * direction, behavior: "smooth" });
  };

  return (
    <section className="kj-gr-section" aria-labelledby="kj-gr-heading">
      <div className="kj-gr-shell">
        <header className="kj-gr-heading">
          <div className="kj-gr-heading__intro">
            <span className="kj-gr-eyebrow">LỜI NHẮN TỪ KHÁCH HÀNG</span>
            <h2 id="kj-gr-heading">Trải nghiệm thật, niềm tin thật.</h2>
            <p>Khám phá những chia sẻ công khai của khách hàng trên Google Maps.</p>
          </div>
          <div className="kj-gr-summary">
            {typeof data?.rating === "number" && (
              <div className="kj-gr-summary__rating">
                <strong>{data.rating.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}/5</strong>
                <ReviewStars rating={data.rating} />
                {typeof data.userRatingCount === "number" && (
                  <small>{data.userRatingCount.toLocaleString("vi-VN")} lượt đánh giá</small>
                )}
              </div>
            )}
           {/* <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="kj-gr-google-link">
              Xem trên Google Maps <span aria-hidden="true">↗</span>
            </a>*/}
          </div>
        </header>

        {reviews.length > 0 ? (
          <>
            <div className="kj-gr-toolbar">
              <span>{reviews.length} đánh giá được Google cung cấp</span>
              {reviews.length > 1 && (
                <div className="kj-gr-controls" aria-label="Điều khiển đánh giá">
                  <button type="button" aria-label="Đánh giá trước" onClick={() => slide(-1)}>‹</button>
                  <button type="button" aria-label="Đánh giá tiếp theo" onClick={() => slide(1)}>›</button>
                </div>
              )}
            </div>
            <div className="kj-gr-track" ref={trackRef} aria-label="Đánh giá khách hàng Google Maps">
              {reviews.map((review, index) => {
                const authorHref = safeExternalUrl(review.authorUrl);
                const reviewHref = safeExternalUrl(review.reviewUrl) || mapsHref;
                const avatar = safeExternalUrl(review.authorPhotoUrl);
                return (
                  <article className="kj-gr-card" key={review.id || String(index)}>
                    <div className="kj-gr-card__top">
                      {avatar ? (
                        <img className="kj-gr-avatar" src={avatar} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="kj-gr-avatar kj-gr-avatar--letter" aria-hidden="true">
                          {review.authorName?.trim()?.charAt(0)?.toUpperCase() || "K"}
                        </span>
                      )}
                      <div className="kj-gr-card__author">
                        {authorHref ? (
                          <a href={authorHref} target="_blank" rel="noopener noreferrer">{review.authorName || "Người đánh giá Google"}</a>
                        ) : (
                          <strong>{review.authorName || "Người đánh giá Google"}</strong>
                        )}
                        <small>{review.relativeTime || (review.publishedAt ? new Date(review.publishedAt).toLocaleDateString("vi-VN") : "Google Maps")}</small>
                      </div>
                      <span className="kj-gr-card__quote" aria-hidden="true">”</span>
                    </div>
                    <ReviewStars rating={review.rating} />
                    <p className="kj-gr-card__text">{review.text}</p>
                    <a className="kj-gr-card__more" href={reviewHref} target="_blank" rel="noopener noreferrer">
                      Xem đánh giá gốc ↗
                    </a>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="kj-gr-empty" role="status">
            <div className="kj-gr-empty__icon" aria-hidden="true">✦</div>
            <p>
              {loading
                ? "Đang kết nối dữ liệu đánh giá từ Google Maps…"
                : "Mời bạn xem các đánh giá và trải nghiệm thực tế của khách hàng trên Google Maps."}
            </p>
            <a href={mapsHref} target="_blank" rel="noopener noreferrer">Mở đánh giá Google Maps ↗</a>
          </div>
        )}
        <p className="kj-gr-attribution">Nguồn đánh giá: <a href={mapsHref} target="_blank" rel="noopener noreferrer">Google Maps</a>. Tác giả và nội dung thuộc về người đăng đánh giá.</p>
      </div>
    </section>
  );
};

export default GoogleMapsReviews;
