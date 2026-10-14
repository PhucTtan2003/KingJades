namespace WebKingJades.Features.News.Services;

public interface INewsImageStorage
{
    Task<string> SaveAsync(
        IFormFile file,
        CancellationToken cancellationToken);
}
