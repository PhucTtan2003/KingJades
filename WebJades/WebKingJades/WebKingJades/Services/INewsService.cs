using WebKingJades.Features.News.Dtos;

namespace WebKingJades.Features.News.Services;

public interface INewsService
{
    Task<PagedResult<NewsListItemResponse>> GetAdminPageAsync(
        NewsQueryRequest query,
        CancellationToken cancellationToken);

    Task<PagedResult<NewsListItemResponse>> GetPublicPageAsync(
        NewsQueryRequest query,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<NewsListItemResponse>> GetFeaturedAsync(
        int take,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<NewsListItemResponse>> GetLatestAsync(
        int take,
        CancellationToken cancellationToken);

    Task<NewsArticleResponse> GetByIdAsync(
        string id,
        CancellationToken cancellationToken);

    Task<NewsArticleResponse> GetPublicBySlugAsync(
        string slug,
        bool increaseView,
        CancellationToken cancellationToken);

    Task<NewsRatingResponse> GetRatingAsync(
        string slug,
        string? userId,
        string? visitorId,
        CancellationToken cancellationToken);

    Task<NewsRatingResponse> SubmitRatingAsync(
        string slug,
        SubmitNewsRatingRequest request,
        string? userId,
        CancellationToken cancellationToken);

    Task<NewsArticleResponse> CreateAsync(
        CreateNewsArticleRequest request,
        string authorId,
        string authorName,
        CancellationToken cancellationToken);

    Task<NewsArticleResponse> UpdateAsync(
        string id,
        UpdateNewsArticleRequest request,
        CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);

    Task<NewsArticleResponse> PublishAsync(
        string id,
        int version,
        CancellationToken cancellationToken);

    Task<NewsArticleResponse> UnpublishAsync(
        string id,
        int version,
        CancellationToken cancellationToken);

    Task<NewsArticleResponse> ScheduleAsync(
        string id,
        int version,
        DateTime scheduledAtUtc,
        CancellationToken cancellationToken);

    Task<NewsArticleResponse> DuplicateAsync(
        string id,
        string authorId,
        string authorName,
        CancellationToken cancellationToken);
}
