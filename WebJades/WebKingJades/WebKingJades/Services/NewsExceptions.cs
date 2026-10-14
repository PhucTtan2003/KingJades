namespace WebKingJades.Features.News.Services;

public sealed class NewsNotFoundException : Exception
{
    public NewsNotFoundException(string message) : base(message)
    {
    }
}

public sealed class NewsConflictException : Exception
{
    public NewsConflictException(string message) : base(message)
    {
    }
}

public sealed class NewsValidationException : Exception
{
    public NewsValidationException(string message) : base(message)
    {
    }
}
