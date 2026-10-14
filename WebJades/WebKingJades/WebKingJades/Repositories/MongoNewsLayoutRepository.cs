using MongoDB.Driver;
using WebKingJades.Data;
using WebKingJades.Features.News.Models;

namespace WebKingJades.Features.News.Repositories;

public sealed class MongoNewsLayoutRepository
    : INewsLayoutRepository
{
    private readonly
        IMongoCollection<NewsLayoutTemplate> _collection;

    public MongoNewsLayoutRepository(
        MongoDbContext context)
    {
        _collection =
            context.NewsLayoutTemplates;
    }

    public async Task<IReadOnlyList<NewsLayoutTemplate>>
        GetAllAsync(
            CancellationToken cancellationToken)
    {
        var items = await _collection
            .Find(x => !x.IsDeleted)
            .SortByDescending(x => x.IsDefault)
            .ThenByDescending(x => x.UpdatedAtUtc)
            .ToListAsync(cancellationToken);

        return items;
    }

    public Task<NewsLayoutTemplate?> GetByIdAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsLayoutTemplate>.Filter.Eq(
                x => x.Id,
                id
            )
            & Builders<NewsLayoutTemplate>.Filter.Eq(
                x => x.IsDeleted,
                false
            );

        return _collection
            .Find(filter)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task CreateAsync(
        NewsLayoutTemplate template,
        CancellationToken cancellationToken)
    {
        return _collection.InsertOneAsync(
            template,
            cancellationToken: cancellationToken
        );
    }

    public async Task<bool> ReplaceAsync(
        NewsLayoutTemplate template,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsLayoutTemplate>.Filter.Eq(
                x => x.Id,
                template.Id
            )
            & Builders<NewsLayoutTemplate>.Filter.Eq(
                x => x.IsDeleted,
                false
            );

        var result = await _collection.ReplaceOneAsync(
            filter,
            template,
            cancellationToken: cancellationToken
        );

        return result.ModifiedCount == 1;
    }

    public async Task<bool> SoftDeleteAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsLayoutTemplate>.Filter.Eq(
                x => x.Id,
                id
            )
            & Builders<NewsLayoutTemplate>.Filter.Eq(
                x => x.IsDeleted,
                false
            );

        var update =
            Builders<NewsLayoutTemplate>.Update
                .Set(
                    x => x.IsDeleted,
                    true
                )
                .Set(
                    x => x.IsDefault,
                    false
                )
                .Set(
                    x => x.UpdatedAtUtc,
                    DateTime.UtcNow
                );

        var result = await _collection.UpdateOneAsync(
            filter,
            update,
            cancellationToken: cancellationToken
        );

        return result.ModifiedCount == 1;
    }

    public async Task ClearDefaultAsync(
        string? exceptId,
        CancellationToken cancellationToken)
    {
        var builder =
            Builders<NewsLayoutTemplate>.Filter;

        var filter =
            builder.Eq(
                x => x.IsDeleted,
                false
            )
            & builder.Eq(
                x => x.IsDefault,
                true
            );

        if (!string.IsNullOrWhiteSpace(exceptId))
        {
            filter &= builder.Ne(
                x => x.Id,
                exceptId
            );
        }

        var update =
            Builders<NewsLayoutTemplate>.Update
                .Set(
                    x => x.IsDefault,
                    false
                )
                .Set(
                    x => x.UpdatedAtUtc,
                    DateTime.UtcNow
                );

        await _collection.UpdateManyAsync(
            filter,
            update,
            cancellationToken: cancellationToken
        );
    }
}