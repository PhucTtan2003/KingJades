using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Models;

namespace WebKingJades.Features.News.Repositories;

public interface INewsRepository
{
    Task<PagedResult<NewsArticle>> GetAdminPageAsync(
        NewsQueryRequest query,
        CancellationToken cancellationToken);

    Task<PagedResult<NewsArticle>> GetPublicPageAsync(
        NewsQueryRequest query,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<NewsArticle>> GetFeaturedAsync(
        int take,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<NewsArticle>> GetLatestAsync(
        int take,
        CancellationToken cancellationToken);

    Task<NewsArticle?> GetByIdAsync(string id, CancellationToken cancellationToken);
    Task<NewsArticle?> GetPublishedBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<bool> SlugExistsAsync(string slug, string? exceptId, CancellationToken cancellationToken);

    Task CreateAsync(NewsArticle article, CancellationToken cancellationToken);

    Task<bool> ReplaceAsync(
        NewsArticle article,
        int expectedVersion,
        CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(string id, CancellationToken cancellationToken);

    Task<bool> IncrementViewAsync(string id, CancellationToken cancellationToken);

    Task<NewsRating?> GetClientRatingAsync(
        string articleId,
        string raterKey,
        CancellationToken cancellationToken);

    Task UpsertClientRatingAsync(
        NewsRating rating,
        CancellationToken cancellationToken);

    Task<(double Average, long Count)> RefreshClientRatingSummaryAsync(
        string articleId,
        CancellationToken cancellationToken);

    Task<long> PublishDueScheduledAsync(
        DateTime utcNow,
        CancellationToken cancellationToken);
}
