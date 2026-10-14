using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Infrastructure;
using WebKingJades.Features.News.Models;
using WebKingJades.Features.News.Repositories;

namespace WebKingJades.Features.News.Services;

public sealed class NewsLayoutService : INewsLayoutService
{
    private readonly INewsLayoutRepository _repository;

    public NewsLayoutService(INewsLayoutRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyList<NewsLayoutResponse>> GetAllAsync(
        CancellationToken cancellationToken)
    {
        var items = await _repository.GetAllAsync(cancellationToken);
        return items.Select(ToResponse).ToList();
    }

    public async Task<NewsLayoutResponse> GetByIdAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var template = await GetRequiredAsync(id, cancellationToken);
        return ToResponse(template);
    }

    public async Task<NewsLayoutResponse> CreateAsync(
        CreateNewsLayoutRequest request,
        string userId,
        string userName,
        CancellationToken cancellationToken)
    {
        if (request.IsDefault)
        {
            await _repository.ClearDefaultAsync(
                null,
                cancellationToken);
        }

        var now = DateTime.UtcNow;

        var template = new NewsLayoutTemplate
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            ThumbnailUrl = request.ThumbnailUrl.Trim(),
            IsDefault = request.IsDefault,
            Blocks = MapBlocks(request.Blocks),
            CreatedById = userId,
            CreatedByName = userName,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        await _repository.CreateAsync(template, cancellationToken);
        return ToResponse(template);
    }

    public async Task<NewsLayoutResponse> UpdateAsync(
        string id,
        UpdateNewsLayoutRequest request,
        CancellationToken cancellationToken)
    {
        var template = await GetRequiredAsync(id, cancellationToken);

        if (request.IsDefault)
        {
            await _repository.ClearDefaultAsync(
                id,
                cancellationToken);
        }

        template.Name = request.Name.Trim();
        template.Description = request.Description.Trim();
        template.ThumbnailUrl = request.ThumbnailUrl.Trim();
        template.IsDefault = request.IsDefault;
        template.Blocks = MapBlocks(request.Blocks);
        template.UpdatedAtUtc = DateTime.UtcNow;

        var updated = await _repository.ReplaceAsync(
            template,
            cancellationToken);

        if (!updated)
        {
            throw new NewsNotFoundException(
                "Không tìm thấy mẫu layout.");
        }

        return ToResponse(template);
    }

    public async Task DeleteAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var deleted = await _repository.SoftDeleteAsync(
            id,
            cancellationToken);

        if (!deleted)
        {
            throw new NewsNotFoundException(
                "Không tìm thấy mẫu layout.");
        }
    }

    private async Task<NewsLayoutTemplate> GetRequiredAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var item = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        return item ?? throw new NewsNotFoundException(
            "Không tìm thấy mẫu layout.");
    }

    private static List<NewsBlock> MapBlocks(
        IEnumerable<NewsBlockRequest> blocks)
    {
        return blocks
            .Select((block, index) => block.ToModel(index))
            .OrderBy(x => x.Order)
            .Select((block, index) =>
            {
                block.Order = index;
                return block;
            })
            .ToList();
    }

    private static NewsLayoutResponse ToResponse(
        NewsLayoutTemplate template)
    {
        return new NewsLayoutResponse
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            ThumbnailUrl = template.ThumbnailUrl,
            IsDefault = template.IsDefault,
            Blocks = template.Blocks
                .OrderBy(x => x.Order)
                .Select(x => x.ToResponse())
                .ToList(),
            CreatedByName = template.CreatedByName,
            CreatedAtUtc = template.CreatedAtUtc,
            UpdatedAtUtc = template.UpdatedAtUtc
        };
    }
}
