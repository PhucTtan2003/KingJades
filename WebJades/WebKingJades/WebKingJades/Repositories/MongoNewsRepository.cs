using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;
using WebKingJades.Data;
using WebKingJades.Features.News.Dtos;
using WebKingJades.Features.News.Models;

namespace WebKingJades.Features.News.Repositories;

public sealed class MongoNewsRepository : INewsRepository
{
    private readonly IMongoCollection<NewsArticle> _collection;
    private readonly IMongoCollection<NewsRating> _ratings;
    private static int _ratingIndexInitialized;
    // Serializes rating summary writes per article within this application process.
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _summaryLocks = new();

    public MongoNewsRepository(MongoDbContext context)
    {
        _collection = context.NewsArticles;
        _ratings = context.NewsRatings;

        if (System.Threading.Interlocked.CompareExchange(
                ref _ratingIndexInitialized,
                1,
                0) == 0)
        {
            try
            {
                var ratingIndexKeys =
                    Builders<NewsRating>.IndexKeys
                        .Ascending(x => x.ArticleId)
                        .Ascending(x => x.RaterKey);

                var ratingIndex =
                    new CreateIndexModel<NewsRating>(
                        ratingIndexKeys,
                        new CreateIndexOptions
                        {
                            Name =
                                "ux_news_rating_article_rater",
                            Unique = true
                        });

                // One unique rating per article + account/browser.
                _ratings.Indexes.CreateOne(
                    ratingIndex);
            }
            catch
            {
                System.Threading.Interlocked.Exchange(
                    ref _ratingIndexInitialized,
                    0);

                throw;
            }
        }
    }

    public async Task<PagedResult<NewsArticle>> GetAdminPageAsync(
        NewsQueryRequest query,
        CancellationToken cancellationToken)
    {
        var filter = BuildFilter(
            query,
            publicOnly: false
        );

        var total = await _collection.CountDocumentsAsync(
            filter,
            cancellationToken: cancellationToken
        );

        var items = await _collection
            .Find(filter)
            .SortByDescending(x => x.UpdatedAtUtc)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<NewsArticle>
        {
            Items = items,
            TotalItems = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<PagedResult<NewsArticle>> GetPublicPageAsync(
        NewsQueryRequest query,
        CancellationToken cancellationToken)
    {
        var filter = BuildFilter(
            query,
            publicOnly: true
        );

        var total = await _collection.CountDocumentsAsync(
            filter,
            cancellationToken: cancellationToken
        );

        var items = await _collection
            .Find(filter)
            .SortByDescending(x => x.PublishedAtUtc)
            .Skip((query.Page - 1) * query.PageSize)
            .Limit(query.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<NewsArticle>
        {
            Items = items,
            TotalItems = total,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public Task<IReadOnlyList<NewsArticle>> GetFeaturedAsync(
        int take,
        CancellationToken cancellationToken)
    {
        var filter =
            PublicFilter()
            & Builders<NewsArticle>.Filter.Eq(
                x => x.IsFeatured,
                true
            );

        return FindAsReadOnlyAsync(
            filter,
            take,
            cancellationToken
        );
    }

    public Task<IReadOnlyList<NewsArticle>> GetLatestAsync(
        int take,
        CancellationToken cancellationToken)
    {
        return FindAsReadOnlyAsync(
            PublicFilter(),
            take,
            cancellationToken
        );
    }

    public Task<NewsArticle?> GetByIdAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsArticle>.Filter.Eq(
                x => x.Id,
                id
            )
            & Builders<NewsArticle>.Filter.Eq(
                x => x.IsDeleted,
                false
            );

        return _collection
            .Find(filter)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<NewsArticle?> GetPublishedBySlugAsync(
        string slug,
        CancellationToken cancellationToken)
    {
        var filter =
            PublicFilter()
            & Builders<NewsArticle>.Filter.Eq(
                x => x.Slug,
                slug
            );

        return _collection
            .Find(filter)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> SlugExistsAsync(
        string slug,
        string? exceptId,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsArticle>.Filter.Eq(
                x => x.Slug,
                slug
            )
            & Builders<NewsArticle>.Filter.Eq(
                x => x.IsDeleted,
                false
            );

        if (!string.IsNullOrWhiteSpace(exceptId))
        {
            filter &=
                Builders<NewsArticle>.Filter.Ne(
                    x => x.Id,
                    exceptId
                );
        }

        return _collection
            .Find(filter)
            .AnyAsync(cancellationToken);
    }

    public Task CreateAsync(
        NewsArticle article,
        CancellationToken cancellationToken)
    {
        return _collection.InsertOneAsync(
            article,
            cancellationToken: cancellationToken
        );
    }

    public async Task<bool> ReplaceAsync(
        NewsArticle article,
        int expectedVersion,
        CancellationToken cancellationToken)
    {
        var filter = Builders<NewsArticle>.Filter.Eq(x => x.Id, article.Id)
            & Builders<NewsArticle>.Filter.Eq(x => x.Version, expectedVersion)
            & Builders<NewsArticle>.Filter.Eq(x => x.IsDeleted, false);

        // Field-level atomic update: never overwrite client rating aggregates
        // or ViewCount while Admin edits a post.
        var update = Builders<NewsArticle>.Update
            .Set(x => x.Title, article.Title)
            .Set(x => x.Subtitle, article.Subtitle)
            .Set(x => x.Slug, article.Slug)
            .Set(x => x.Summary, article.Summary)
            .Set(x => x.CoverImageUrl, article.CoverImageUrl)
            .Set(x => x.BannerImageUrl, article.BannerImageUrl)
            .Set(x => x.Category, article.Category)
            .Set(x => x.Tags, article.Tags)
            .Set(x => x.AuthorId, article.AuthorId)
            .Set(x => x.AuthorName, article.AuthorName)
            .Set(x => x.Status, article.Status)
            .Set(x => x.IsFeatured, article.IsFeatured)
            .Set(x => x.ShowOnHomePage, article.ShowOnHomePage)
            .Set(x => x.Rating, article.Rating)
            .Set(x => x.Blocks, article.Blocks)
            .Set(x => x.Seo, article.Seo)
            .Set(x => x.Typography, article.Typography)
            .Set(x => x.TextStyle, article.TextStyle)
            .Set(x => x.PublishedAtUtc, article.PublishedAtUtc)
            .Set(x => x.ScheduledAtUtc, article.ScheduledAtUtc)
            .Set(x => x.UpdatedAtUtc, article.UpdatedAtUtc)
            .Inc(x => x.Version, 1);

        var result = await _collection.UpdateOneAsync(
            filter, update, cancellationToken: cancellationToken);

        return result.ModifiedCount == 1;
    }

    public async Task<bool> SoftDeleteAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsArticle>.Filter.Eq(
                x => x.Id,
                id
            )
            & Builders<NewsArticle>.Filter.Eq(
                x => x.IsDeleted,
                false
            );

        var update = Builders<NewsArticle>.Update
            .Set(x => x.IsDeleted, true)
            .Set(x => x.UpdatedAtUtc, DateTime.UtcNow)
            .Inc(x => x.Version, 1);

        var result = await _collection.UpdateOneAsync(
            filter,
            update,
            cancellationToken: cancellationToken
        );

        return result.ModifiedCount == 1;
    }

    public async Task<bool> IncrementViewAsync(
        string id,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsArticle>.Filter.Eq(
                x => x.Id,
                id
            )
            & Builders<NewsArticle>.Filter.Eq(
                x => x.IsDeleted,
                false
            );

        var update =
            Builders<NewsArticle>.Update.Inc(
                x => x.ViewCount,
                1
            );

        var result = await _collection.UpdateOneAsync(
            filter,
            update,
            cancellationToken: cancellationToken
        );

        return result.ModifiedCount == 1;
    }

    public Task<NewsRating?> GetClientRatingAsync(
        string articleId,
        string raterKey,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsRating>.Filter.Eq(
                x => x.ArticleId,
                articleId
            )
            & Builders<NewsRating>.Filter.Eq(
                x => x.RaterKey,
                raterKey
            );

        return _ratings
            .Find(filter)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task UpsertClientRatingAsync(
        NewsRating rating,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsRating>.Filter.Eq(
                x => x.ArticleId,
                rating.ArticleId
            )
            & Builders<NewsRating>.Filter.Eq(
                x => x.RaterKey,
                rating.RaterKey
            );

        var update = Builders<NewsRating>.Update
            .SetOnInsert(
                x => x.ArticleId,
                rating.ArticleId
            )
            .SetOnInsert(
                x => x.RaterKey,
                rating.RaterKey
            )
            .SetOnInsert(
                x => x.CreatedAtUtc,
                rating.CreatedAtUtc
            )
            .Set(
                x => x.UserId,
                rating.UserId
            )
            .Set(
                x => x.VisitorId,
                rating.VisitorId
            )
            .Set(
                x => x.IsAuthenticated,
                rating.IsAuthenticated
            )
            .Set(
                x => x.Value,
                rating.Value
            )
            .Set(
                x => x.UpdatedAtUtc,
                rating.UpdatedAtUtc
            );

        try
        {
            await _ratings.UpdateOneAsync(
                filter,
                update,
                new UpdateOptions { IsUpsert = true },
                cancellationToken);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Code == 11000)
        {
            // Concurrent initial votes from one browser can race on the
            // compound unique index. Retry as an update, not a second insert.
            await _ratings.UpdateOneAsync(
                filter,
                update,
                new UpdateOptions { IsUpsert = false },
                cancellationToken);
        }
    }

    public async Task<(double Average, long Count)>
        RefreshClientRatingSummaryAsync(
            string articleId,
            CancellationToken cancellationToken)
    {
        // Ensures a later completed vote eventually wins over earlier refreshes
        // inside one ASP.NET Core process. Multi-instance deployments need
        // distributed coordination or a different aggregate strategy.
        var gate = _summaryLocks.GetOrAdd(articleId, _ => new SemaphoreSlim(1, 1));
        await gate.WaitAsync(cancellationToken);
        try
        {
            var ratingFilter = Builders<NewsRating>.Filter.Eq(
                x => x.ArticleId, articleId);

            // Aggregate on MongoDB server rather than transferring all votes.
            var aggregate = await _ratings.Aggregate()
                .Match(ratingFilter)
                .Group(
                    x => x.ArticleId,
                    grouped => new
                    {
                        Count = grouped.Count(),
                        Average = grouped.Average(x => x.Value)
                    })
                .FirstOrDefaultAsync(cancellationToken);

            var count = aggregate is null ? 0L : (long)aggregate.Count;
            var average = aggregate is null
                ? 0d
                : Math.Round(aggregate.Average, 2, MidpointRounding.AwayFromZero);

            var articleFilter = Builders<NewsArticle>.Filter.Eq(x => x.Id, articleId)
                & Builders<NewsArticle>.Filter.Eq(x => x.IsDeleted, false);
            var update = Builders<NewsArticle>.Update
                .Set(x => x.CustomerRatingAverage, average)
                .Set(x => x.CustomerRatingCount, count);

            await _collection.UpdateOneAsync(
                articleFilter, update, cancellationToken: cancellationToken);

            return (average, count);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<long> PublishDueScheduledAsync(
        DateTime utcNow,
        CancellationToken cancellationToken)
    {
        var filter =
            Builders<NewsArticle>.Filter.Eq(
                x => x.Status,
                NewsStatus.Scheduled
            )
            & Builders<NewsArticle>.Filter.Eq(
                x => x.IsDeleted,
                false
            )
            & Builders<NewsArticle>.Filter.Ne(
                x => x.ScheduledAtUtc,
                null
            )
            & Builders<NewsArticle>.Filter.Lte(
                x => x.ScheduledAtUtc,
                utcNow
            );

        var update = Builders<NewsArticle>.Update
            .Set(
                x => x.Status,
                NewsStatus.Published
            )
            .Set(
                x => x.PublishedAtUtc,
                utcNow
            )
            .Set(
                x => x.ScheduledAtUtc,
                null
            )
            .Set(
                x => x.UpdatedAtUtc,
                utcNow
            )
            .Inc(
                x => x.Version,
                1
            );

        var result = await _collection.UpdateManyAsync(
            filter,
            update,
            cancellationToken: cancellationToken
        );

        return result.ModifiedCount;
    }

    private FilterDefinition<NewsArticle> BuildFilter(
        NewsQueryRequest query,
        bool publicOnly)
    {
        var builder =
            Builders<NewsArticle>.Filter;

        var filter =
            builder.Eq(
                x => x.IsDeleted,
                false
            );

        if (publicOnly)
        {
            filter &= PublicFilter();
        }
        else if (query.Status.HasValue)
        {
            filter &= builder.Eq(
                x => x.Status,
                query.Status.Value
            );
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var escaped =
                Regex.Escape(query.Search.Trim());

            var regex =
                new BsonRegularExpression(
                    escaped,
                    "i"
                );

            filter &= builder.Or(
                builder.Regex(
                    x => x.Title,
                    regex
                ),
                builder.Regex(
                    x => x.Subtitle,
                    regex
                ),
                builder.Regex(
                    x => x.Summary,
                    regex
                )
            );
        }

        if (!string.IsNullOrWhiteSpace(query.Category))
        {
            filter &= builder.Eq(
                x => x.Category,
                query.Category.Trim()
            );
        }

        if (query.IsFeatured.HasValue)
        {
            filter &= builder.Eq(
                x => x.IsFeatured,
                query.IsFeatured.Value
            );
        }

        if (query.ShowOnHomePage.HasValue)
        {
            filter &= builder.Eq(
                x => x.ShowOnHomePage,
                query.ShowOnHomePage.Value
            );
        }

        return filter;
    }

    private static FilterDefinition<NewsArticle> PublicFilter()
    {
        var builder =
            Builders<NewsArticle>.Filter;

        return
            builder.Eq(
                x => x.IsDeleted,
                false
            )
            & builder.Eq(
                x => x.Status,
                NewsStatus.Published
            )
            & builder.Ne(
                x => x.PublishedAtUtc,
                null
            )
            & builder.Lte(
                x => x.PublishedAtUtc,
                DateTime.UtcNow
            );
    }

    private async Task<IReadOnlyList<NewsArticle>>
        FindAsReadOnlyAsync(
            FilterDefinition<NewsArticle> filter,
            int take,
            CancellationToken cancellationToken)
    {
        var normalizedTake =
            Math.Clamp(take, 1, 50);

        var items = await _collection
            .Find(filter)
            .SortByDescending(x => x.PublishedAtUtc)
            .Limit(normalizedTake)
            .ToListAsync(cancellationToken);

        return items;
    }
}