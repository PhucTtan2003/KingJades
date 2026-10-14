using WebKingJades.Features.News.Dtos;

namespace WebKingJades.Features.News.Services;

public interface INewsLayoutService
{
    Task<IReadOnlyList<NewsLayoutResponse>> GetAllAsync(
        CancellationToken cancellationToken);

    Task<NewsLayoutResponse> GetByIdAsync(
        string id,
        CancellationToken cancellationToken);

    Task<NewsLayoutResponse> CreateAsync(
        CreateNewsLayoutRequest request,
        string userId,
        string userName,
        CancellationToken cancellationToken);

    Task<NewsLayoutResponse> UpdateAsync(
        string id,
        UpdateNewsLayoutRequest request,
        CancellationToken cancellationToken);

    Task DeleteAsync(string id, CancellationToken cancellationToken);
}
