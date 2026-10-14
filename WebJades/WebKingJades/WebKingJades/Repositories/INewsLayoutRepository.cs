using WebKingJades.Features.News.Models;

namespace WebKingJades.Features.News.Repositories;

public interface INewsLayoutRepository
{
    Task<IReadOnlyList<NewsLayoutTemplate>> GetAllAsync(
        CancellationToken cancellationToken);

    Task<NewsLayoutTemplate?> GetByIdAsync(
        string id,
        CancellationToken cancellationToken);

    Task CreateAsync(
        NewsLayoutTemplate template,
        CancellationToken cancellationToken);

    Task<bool> ReplaceAsync(
        NewsLayoutTemplate template,
        CancellationToken cancellationToken);

    Task<bool> SoftDeleteAsync(
        string id,
        CancellationToken cancellationToken);

    Task ClearDefaultAsync(
        string? exceptId,
        CancellationToken cancellationToken);
}
