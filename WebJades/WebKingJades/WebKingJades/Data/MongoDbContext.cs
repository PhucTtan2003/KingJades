using Microsoft.Extensions.Options;
using MongoDB.Driver;
using WebKingJades.Features.News.Models;
using WebKingJades.Models;
using WebKingJades.Settings;

namespace WebKingJades.Data
{
    public class MongoDbContext
    {
        private readonly MongoClient _client;
        private readonly IMongoDatabase _database;

        public MongoDbContext(
            IOptions<MongoDbSettings> options)
        {
            var settings = options.Value;

            if (string.IsNullOrWhiteSpace(
                    settings.ConnectionString))
            {
                throw new InvalidOperationException(
                    "MongoDbSettings:ConnectionString chưa được cấu hình."
                );
            }

            if (string.IsNullOrWhiteSpace(
                    settings.DatabaseName))
            {
                throw new InvalidOperationException(
                    "MongoDbSettings:DatabaseName chưa được cấu hình."
                );
            }

            _client = new MongoClient(
                settings.ConnectionString
            );

            _database = _client.GetDatabase(
                settings.DatabaseName
            );
        }

        // ==================================================
        // DATABASE
        // ==================================================

        public IMongoDatabase Database => _database;

        public string DatabaseName =>
            _database.DatabaseNamespace.DatabaseName;

        // ==================================================
        // ACCOUNT
        // ==================================================

        public IMongoCollection<Account> Accounts =>
            _database.GetCollection<Account>(
                "accounts"
            );

        public IMongoCollection<Role> Roles =>
            _database.GetCollection<Role>(
                "roles"
            );

        // ==================================================
        // PRODUCT
        // ==================================================

        public IMongoCollection<Product> Products =>
            _database.GetCollection<Product>(
                "Products"
            );

        // ==================================================
        // CONTACT LEAD
        // ==================================================

        public IMongoCollection<ContactLead> ContactLeads =>
            _database.GetCollection<ContactLead>(
                "contact_leads"
            );

        // ==================================================
        // NEWS
        // ==================================================

        public IMongoCollection<NewsArticle> NewsArticles =>
            _database.GetCollection<NewsArticle>(
                "NewsArticles"
            );

        public IMongoCollection<NewsLayoutTemplate>
            NewsLayoutTemplates =>
                _database.GetCollection<NewsLayoutTemplate>(
                    "NewsLayoutTemplates"
                );

        public IMongoCollection<NewsRating> NewsRatings =>
            _database.GetCollection<NewsRating>(
                "NewsRatings"
            );
    }
}
