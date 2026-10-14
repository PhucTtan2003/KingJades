using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Bson;
using MongoDB.Driver;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using WebKingJades.Data;
using WebKingJades.Models;
using WebKingJades.Services;
using WebKingJades.Settings;

namespace WebKingJades.Controllers
{
    [ApiController]
    [Route("api/accounts")]
    [Authorize(Roles = "admin")]
    public class AccountController : ControllerBase
    {
        // =========================================================
        // CONSTANTS
        // =========================================================

        private const int EmailVerificationExpiryMinutes = 10;
        private const int PublicUserRoleId = 3;

        // =========================================================
        // DEPENDENCIES
        // =========================================================

        private readonly MongoDbContext _context;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly JwtSettings _jwtSettings;

        // =========================================================
        // CONSTRUCTOR
        // =========================================================

        public AccountController(
            MongoDbContext context,
            IEmailService emailService,
            IConfiguration configuration,
            IOptions<JwtSettings> jwtOptions)
        {
            _context = context;
            _emailService = emailService;
            _configuration = configuration;
            _jwtSettings = jwtOptions.Value;
        }

        // =========================================================
        // GET: api/accounts
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetAccounts(
            [FromQuery] string? search)
        {
            var filter = Builders<Account>.Filter.Empty;

            if (!string.IsNullOrWhiteSpace(search))
            {
                var regex = new BsonRegularExpression(
                    search.Trim(),
                    "i"
                );

                filter = Builders<Account>.Filter.Or(
                    Builders<Account>.Filter.Regex(
                        x => x.Username,
                        regex
                    ),
                    Builders<Account>.Filter.Regex(
                        x => x.Email,
                        regex
                    ),
                    Builders<Account>.Filter.Regex(
                        x => x.Phone,
                        regex
                    )
                );
            }

            var accounts = await _context.Accounts
                .Find(filter)
                .SortBy(x => x.Username)
                .ToListAsync();

            var roles = await _context.Roles
                .Find(Builders<Role>.Filter.Empty)
                .ToListAsync();

            var result = accounts.Select(account =>
            {
                var role = roles.FirstOrDefault(
                    r => r.RoleId == account.RoleId
                );

                return new
                {
                    id = account.Id ?? "",
                    username = account.Username,
                    email = account.Email,
                    phone = account.Phone,
                    roleId = account.RoleId,
                    role = RoleIdToKey(account.RoleId),

                    // roleName dùng để hiển thị ở Admin.
                    roleName = role?.RoleName ?? RoleIdToKey(account.RoleId),

                    status = string.IsNullOrWhiteSpace(account.Status)
                        ? "active"
                        : account.Status,

                    isEmailVerified = account.IsEmailVerified
                };
            });

            return Ok(result);
        }

        // =========================================================
        // GET: api/accounts/roles
        // =========================================================

        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _context.Roles
                .Find(x => x.Status == "active")
                .SortBy(x => x.RoleId)
                .ToListAsync();

            return Ok(
                roles.Select(x => new
                {
                    roleId = x.RoleId,
                    role = RoleIdToKey(x.RoleId),
                    roleName = x.RoleName,
                    description = x.Description,
                    status = x.Status
                })
            );
        }

        // =========================================================
        // GET: api/accounts/{id}
        // =========================================================

        [HttpGet("{id}")]
        public async Task<IActionResult> GetAccountById(
            string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(new
                {
                    message = "Id không hợp lệ"
                });
            }

            var account = await _context.Accounts
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

            if (account == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản"
                });
            }

            var role = await _context.Roles
                .Find(x => x.RoleId == account.RoleId)
                .FirstOrDefaultAsync();

            return Ok(new
            {
                id = account.Id ?? "",
                username = account.Username,
                email = account.Email,
                phone = account.Phone,
                roleId = account.RoleId,
                role = RoleIdToKey(account.RoleId),
                roleName = role?.RoleName ?? RoleIdToKey(account.RoleId),
                status = account.Status,
                isEmailVerified = account.IsEmailVerified
            });
        }

        // =========================================================
        // POST: api/accounts
        //
        // ADMIN tạo account.
        // Account do Admin tạo không cần verify email.
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> CreateAccount(
            [FromBody] AccountUpsertRequest request)
        {
            var validationMessage = ValidateAccountInput(
                request.Username,
                request.Email,
                request.Phone,
                request.Password,
                true
            );

            if (!string.IsNullOrEmpty(validationMessage))
            {
                return BadRequest(new
                {
                    message = validationMessage
                });
            }

            var username = request.Username.Trim();
            var email = request.Email.Trim().ToLowerInvariant();
            var phone = request.Phone.Trim();

            var status = NormalizeStatus(
                request.Status,
                "active"
            );

            if (status == null)
            {
                return BadRequest(new
                {
                    message = "Trạng thái chỉ được là active hoặc inactive"
                });
            }

            var roleId = ResolveRoleId(
                request,
                2
            );

            if (roleId == null)
            {
                return BadRequest(new
                {
                    message = "Vai trò không hợp lệ"
                });
            }

            var role = await _context.Roles
                .Find(x =>
                    x.RoleId == roleId.Value &&
                    x.Status == "active"
                )
                .FirstOrDefaultAsync();

            if (role == null)
            {
                return BadRequest(new
                {
                    message = "Vai trò không tồn tại hoặc đã bị khóa"
                });
            }

            var exists = await _context.Accounts
                .Find(x =>
                    x.Username == username ||
                    x.Email == email ||
                    x.Phone == phone
                )
                .FirstOrDefaultAsync();

            if (exists != null)
            {
                return Conflict(new
                {
                    message = "Tên đăng nhập, email hoặc số điện thoại đã tồn tại"
                });
            }

            var account = new Account
            {
                Username = username,
                Email = email,
                Phone = phone,

                // Không Trim password để tránh thay đổi mật khẩu người dùng nhập.
                Password = request.Password!,

                RoleId = roleId.Value,
                Status = status,

                // Account do Admin tạo không cần verify email.
                IsEmailVerified = true,

                EmailVerificationToken = null,
                EmailVerificationExpiresAtUtc = null
            };

            await _context.Accounts.InsertOneAsync(account);

            return Ok(new
            {
                message = "Tạo tài khoản thành công",
                accountId = account.Id,
                roleId = account.RoleId,
                role = RoleIdToKey(account.RoleId),
                roleName = role.RoleName,
                status = account.Status,
                isEmailVerified = true
            });
        }

        // =========================================================
        // POST: api/accounts/staff
        // =========================================================

        [HttpPost("staff")]
        public async Task<IActionResult> CreateStaffAccount(
            [FromBody] AccountUpsertRequest request)
        {
            request.RoleId = 2;
            request.Role = "staff";

            return await CreateAccount(request);
        }

        // =========================================================
        // REGISTER USER + SEND 6-DIGIT EMAIL CODE
        //
        // POST /api/accounts/register
        // POST /api/auth/register
        // =========================================================

        [AllowAnonymous]
        [HttpPost("register")]
        [HttpPost("~/api/auth/register")]
        public async Task<IActionResult> RegisterUser(
            [FromBody] PublicRegisterRequest request)
        {
            var validationMessage = ValidateAccountInput(
                request.Username,
                request.Email,
                request.Phone,
                request.Password,
                true
            );

            if (!string.IsNullOrEmpty(validationMessage))
            {
                return BadRequest(new
                {
                    code = "INVALID_REGISTER_DATA",
                    message = validationMessage
                });
            }

            var username = request.Username.Trim();
            var email = request.Email.Trim().ToLowerInvariant();
            var phone = request.Phone.Trim();

            var exists = await _context.Accounts
                .Find(x =>
                    x.Username == username ||
                    x.Email == email ||
                    x.Phone == phone
                )
                .FirstOrDefaultAsync();

            if (exists != null)
            {
                return Conflict(new
                {
                    code = "ACCOUNT_EXISTS",
                    message =
                        "Tên đăng nhập, email hoặc số điện thoại đã được sử dụng."
                });
            }

            var role = await _context.Roles
                .Find(x =>
                    x.RoleId == PublicUserRoleId &&
                    x.Status == "active"
                )
                .FirstOrDefaultAsync();

            if (role == null)
            {
                return BadRequest(new
                {
                    code = "USER_ROLE_UNAVAILABLE",
                    message =
                        "Vai trò khách hàng chưa được cấu hình hoặc đang bị khóa."
                });
            }

            var verificationCode = GenerateVerificationCode();

            var expiresAt = DateTime.UtcNow.AddMinutes(
                EmailVerificationExpiryMinutes
            );

            var account = new Account
            {
                Username = username,
                Email = email,
                Phone = phone,

                // Giữ nguyên password người dùng nhập.
                Password = request.Password,

                RoleId = PublicUserRoleId,

                // Chỉ active sau khi xác thực OTP.
                Status = "inactive",
                IsEmailVerified = false,

                // Dùng field token hiện có để lưu OTP 6 số.
                EmailVerificationToken = verificationCode,
                EmailVerificationExpiresAtUtc = expiresAt
            };

            await _context.Accounts.InsertOneAsync(account);

            try
            {
                await _emailService.SendVerificationEmailAsync(
                    account.Email,
                    account.Username,
                    verificationCode
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine("[REGISTER EMAIL ERROR]");
                Console.WriteLine(ex);

                // Rollback chính account vừa tạo để user có thể đăng ký lại.
                // Chỉ xóa đúng account mới tạo, không ảnh hưởng Admin/Staff.
                if (!string.IsNullOrWhiteSpace(account.Id))
                {
                    await _context.Accounts.DeleteOneAsync(
                        x =>
                            x.Id == account.Id &&
                            x.RoleId == PublicUserRoleId &&
                            x.IsEmailVerified == false
                    );
                }

                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        code = "EMAIL_SEND_FAILED",
                        message =
                            "Không gửi được mã xác thực email. Vui lòng thử đăng ký lại."
                    }
                );
            }

            return StatusCode(
                StatusCodes.Status201Created,
                new
                {
                    message =
                        $"Đăng ký thành công. Mã xác thực đã được gửi đến email và có hiệu lực {EmailVerificationExpiryMinutes} phút.",

                    accountId = account.Id,
                    email = account.Email,
                    roleId = account.RoleId,

                    // role dùng cho logic.
                    role = RoleIdToKey(account.RoleId),

                    // Giữ roleName hiển thị từ DB ở response đăng ký.
                    roleName = role.RoleName,

                    status = account.Status,
                    isEmailVerified = false,
                    requiresEmailVerification = true,
                    verificationExpiresInMinutes =
                        EmailVerificationExpiryMinutes,
                    emailVerificationExpiresAtUtc = expiresAt
                }
            );
        }

        // =========================================================
        // RESEND EMAIL VERIFICATION CODE
        //
        // POST /api/auth/resend-verification-code
        //
        // BODY:
        // {
        //   "accountId": "..."
        // }
        // =========================================================

        [AllowAnonymous]
        [HttpPost("~/api/auth/resend-verification-code")]
        public async Task<IActionResult> ResendVerificationCode(
            [FromBody] ResendVerificationCodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.AccountId))
            {
                return BadRequest(new
                {
                    code = "INVALID_ACCOUNT",
                    message = "Tài khoản xác thực không hợp lệ."
                });
            }

            if (!ObjectId.TryParse(request.AccountId, out _))
            {
                return BadRequest(new
                {
                    code = "INVALID_ACCOUNT",
                    message = "Tài khoản xác thực không hợp lệ."
                });
            }

            var account = await _context.Accounts
                .Find(x =>
                    x.Id == request.AccountId &&
                    x.RoleId == PublicUserRoleId
                )
                .FirstOrDefaultAsync();

            if (account == null)
            {
                return NotFound(new
                {
                    code = "ACCOUNT_NOT_FOUND",
                    message = "Không tìm thấy tài khoản cần xác thực."
                });
            }

            if (account.IsEmailVerified)
            {
                return BadRequest(new
                {
                    code = "EMAIL_ALREADY_VERIFIED",
                    message = "Email này đã được xác thực."
                });
            }

            var verificationCode = GenerateVerificationCode();

            var expiresAt = DateTime.UtcNow.AddMinutes(
                EmailVerificationExpiryMinutes
            );

            var update = Builders<Account>.Update
                .Set(x => x.EmailVerificationToken, verificationCode)
                .Set(x => x.EmailVerificationExpiresAtUtc, expiresAt)
                .Set(x => x.Status, "inactive")
                .Set(x => x.IsEmailVerified, false);

            var updateResult = await _context.Accounts.UpdateOneAsync(
                x =>
                    x.Id == account.Id &&
                    x.RoleId == PublicUserRoleId &&
                    x.IsEmailVerified == false,
                update
            );

            if (updateResult.MatchedCount == 0)
            {
                return BadRequest(new
                {
                    code = "RESEND_FAILED",
                    message = "Không thể tạo lại mã xác thực."
                });
            }

            try
            {
                await _emailService.SendVerificationEmailAsync(
                    account.Email,
                    account.Username,
                    verificationCode
                );
            }
            catch (Exception ex)
            {
                Console.WriteLine("[RESEND VERIFICATION EMAIL ERROR]");
                Console.WriteLine(ex);

                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        code = "EMAIL_SEND_FAILED",
                        message =
                            "Không gửi được mã xác thực mới. Vui lòng thử lại."
                    }
                );
            }

            return Ok(new
            {
                message =
                    $"Mã xác thực mới đã được gửi đến email và có hiệu lực {EmailVerificationExpiryMinutes} phút.",
                accountId = account.Id,
                email = account.Email,
                verificationExpiresInMinutes =
                    EmailVerificationExpiryMinutes,
                emailVerificationExpiresAtUtc = expiresAt
            });
        }

        // =========================================================
        // VERIFY EMAIL CODE + AUTO LOGIN
        //
        // POST /api/auth/verify-email-code
        //
        // BODY:
        // {
        //   "accountId": "...",
        //   "code": "123456"
        // }
        // =========================================================

        [AllowAnonymous]
        [HttpPost("~/api/auth/verify-email-code")]
        public async Task<IActionResult> VerifyEmailCode(
            [FromBody] VerifyEmailCodeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.AccountId))
            {
                return BadRequest(new
                {
                    code = "INVALID_ACCOUNT",
                    message = "Tài khoản xác thực không hợp lệ."
                });
            }

            if (!ObjectId.TryParse(request.AccountId, out _))
            {
                return BadRequest(new
                {
                    code = "INVALID_ACCOUNT",
                    message = "Tài khoản xác thực không hợp lệ."
                });
            }

            var verificationCode =
                request.Code?.Trim() ?? "";

            if (!System.Text.RegularExpressions.Regex.IsMatch(
                    verificationCode,
                    @"^\d{6}$"))
            {
                return BadRequest(new
                {
                    code = "INVALID_VERIFICATION_CODE",
                    message = "Mã xác thực phải gồm đúng 6 chữ số."
                });
            }

            var account = await _context.Accounts
                .Find(x =>
                    x.Id == request.AccountId &&
                    x.RoleId == PublicUserRoleId
                )
                .FirstOrDefaultAsync();

            if (account == null)
            {
                return NotFound(new
                {
                    code = "ACCOUNT_NOT_FOUND",
                    message = "Không tìm thấy tài khoản cần xác thực."
                });
            }

            if (account.IsEmailVerified)
            {
                return BadRequest(new
                {
                    code = "EMAIL_ALREADY_VERIFIED",
                    message = "Email này đã được xác thực."
                });
            }

            if (
                account.EmailVerificationExpiresAtUtc == null ||
                account.EmailVerificationExpiresAtUtc.Value <= DateTime.UtcNow
            )
            {
                return BadRequest(new
                {
                    code = "VERIFICATION_EXPIRED",
                    message =
                        $"Mã xác thực đã hết hạn. Mã chỉ có hiệu lực {EmailVerificationExpiryMinutes} phút."
                });
            }

            if (!string.Equals(
                    account.EmailVerificationToken,
                    verificationCode,
                    StringComparison.Ordinal))
            {
                return BadRequest(new
                {
                    code = "INVALID_VERIFICATION_CODE",
                    message = "Mã xác thực không đúng."
                });
            }

            var role = await _context.Roles
                .Find(x =>
                    x.RoleId == account.RoleId &&
                    x.Status == "active"
                )
                .FirstOrDefaultAsync();

            if (role == null)
            {
                return BadRequest(new
                {
                    code = "INVALID_ROLE",
                    message = "Vai trò tài khoản không hợp lệ."
                });
            }

            var update = Builders<Account>.Update
                .Set(x => x.IsEmailVerified, true)
                .Set(x => x.Status, "active")
                .Set(
                    x => x.EmailVerificationToken,
                    (string?)null
                )
                .Set(
                    x => x.EmailVerificationExpiresAtUtc,
                    (DateTime?)null
                );

            var result = await _context.Accounts.UpdateOneAsync(
                x =>
                    x.Id == account.Id &&
                    x.RoleId == PublicUserRoleId &&
                    x.IsEmailVerified == false &&
                    x.EmailVerificationToken == verificationCode,
                update
            );

            if (result.MatchedCount == 0)
            {
                return BadRequest(new
                {
                    code = "VERIFY_FAILED",
                    message = "Không thể xác thực tài khoản."
                });
            }

            // Luôn dùng role key lowercase cho JWT / frontend logic.
            var roleKey = RoleIdToKey(account.RoleId);

            var jwt = GenerateJwtToken(
                account.Id ?? "",
                account.Username,
                account.Email,
                account.RoleId,
                roleKey
            );

            return Ok(new
            {
                message =
                    "Xác thực email thành công. Đang đăng nhập...",

                token = jwt.Token,
                expiresAt = jwt.ExpiresAt,
                accountId = account.Id,
                username = account.Username,
                email = account.Email,
                roleId = account.RoleId,

                // Frontend đang dùng:
                // "admin" | "staff" | "user"
                roleName = roleKey,

                status = "active",
                isEmailVerified = true
            });
        }

        // =========================================================
        // UPDATE ACCOUNT
        // =========================================================

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateAccount(
            string id,
            [FromBody] AccountUpsertRequest request)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(new
                {
                    message = "Id không hợp lệ"
                });
            }

            var account = await _context.Accounts
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

            if (account == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản"
                });
            }

            var validationMessage = ValidateAccountInput(
                request.Username,
                request.Email,
                request.Phone,
                request.Password,
                false
            );

            if (!string.IsNullOrEmpty(validationMessage))
            {
                return BadRequest(new
                {
                    message = validationMessage
                });
            }

            var username = request.Username.Trim();
            var email = request.Email.Trim().ToLowerInvariant();
            var phone = request.Phone.Trim();

            var status = NormalizeStatus(
                request.Status,
                account.Status
            );

            if (status == null)
            {
                return BadRequest(new
                {
                    message = "Trạng thái chỉ được là active hoặc inactive"
                });
            }

            var roleId = ResolveRoleId(
                request,
                account.RoleId
            );

            if (roleId == null)
            {
                return BadRequest(new
                {
                    message = "Vai trò không hợp lệ"
                });
            }

            var role = await _context.Roles
                .Find(x =>
                    x.RoleId == roleId.Value &&
                    x.Status == "active"
                )
                .FirstOrDefaultAsync();

            if (role == null)
            {
                return BadRequest(new
                {
                    message = "Vai trò không tồn tại hoặc đã bị khóa"
                });
            }

            var duplicate = await _context.Accounts
                .Find(x =>
                    x.Id != id &&
                    (
                        x.Username == username ||
                        x.Email == email ||
                        x.Phone == phone
                    )
                )
                .FirstOrDefaultAsync();

            if (duplicate != null)
            {
                return Conflict(new
                {
                    message =
                        "Tên đăng nhập, email hoặc số điện thoại đã tồn tại"
                });
            }

            var update = Builders<Account>.Update
                .Set(x => x.Username, username)
                .Set(x => x.Email, email)
                .Set(x => x.Phone, phone)
                .Set(x => x.RoleId, roleId.Value)
                .Set(x => x.Status, status);

            if (!string.IsNullOrEmpty(request.Password))
            {
                if (request.Password.Length < 6)
                {
                    return BadRequest(new
                    {
                        message =
                            "Mật khẩu phải có ít nhất 6 ký tự"
                    });
                }

                // Không Trim password.
                update = update.Set(
                    x => x.Password,
                    request.Password
                );
            }

            await _context.Accounts.UpdateOneAsync(
                x => x.Id == id,
                update
            );

            return Ok(new
            {
                message = "Cập nhật tài khoản thành công",
                roleId = roleId.Value,
                role = RoleIdToKey(roleId.Value),
                roleName = role.RoleName,
                status
            });
        }

        // =========================================================
        // STATUS
        // =========================================================

        [HttpPatch("{id}/status")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateAccountStatus(
            string id,
            [FromBody] AccountStatusRequest request)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(new
                {
                    message = "Id không hợp lệ"
                });
            }

            var status = NormalizeStatus(
                request.Status,
                null
            );

            if (status == null)
            {
                return BadRequest(new
                {
                    message =
                        "Trạng thái chỉ được là active hoặc inactive"
                });
            }

            var result = await _context.Accounts.UpdateOneAsync(
                x => x.Id == id,
                Builders<Account>
                    .Update
                    .Set(
                        x => x.Status,
                        status
                    )
            );

            if (result.MatchedCount == 0)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản"
                });
            }

            return Ok(new
            {
                message =
                    status == "active"
                        ? "Đã mở khóa tài khoản"
                        : "Đã khóa tài khoản",
                status
            });
        }

        // =========================================================
        // DELETE ACCOUNT
        //
        // BẢO VỆ ADMIN
        // =========================================================

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAccount(
            string id)
        {
            if (!ObjectId.TryParse(id, out _))
            {
                return BadRequest(new
                {
                    message = "Id không hợp lệ"
                });
            }

            var account = await _context.Accounts
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();

            if (account == null)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản"
                });
            }

            // Không cho xóa Admin.
            if (account.RoleId == 1)
            {
                return BadRequest(new
                {
                    message =
                        "Không được phép xóa tài khoản Admin."
                });
            }

            var result = await _context.Accounts.DeleteOneAsync(
                x => x.Id == id
            );

            if (result.DeletedCount == 0)
            {
                return NotFound(new
                {
                    message = "Không tìm thấy tài khoản"
                });
            }

            return Ok(new
            {
                message = "Xóa tài khoản thành công"
            });
        }

        // =========================================================
        // JWT
        // =========================================================

        private (
            string Token,
            DateTime ExpiresAt
        ) GenerateJwtToken(
            string accountId,
            string username,
            string email,
            int roleId,
            string roleKey)
        {
            var expiresAt = DateTime.UtcNow.AddHours(
                _jwtSettings.ExpireHours
            );

            var claims = new List<Claim>
            {
                new Claim(
                    ClaimTypes.NameIdentifier,
                    accountId
                ),

                new Claim(
                    ClaimTypes.Name,
                    username
                ),

                new Claim(
                    ClaimTypes.Email,
                    email
                ),

                new Claim(
                    "roleId",
                    roleId.ToString()
                ),

                // Luôn dùng admin/staff/user.
                new Claim(
                    ClaimTypes.Role,
                    roleKey
                )
            };

            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(
                    _jwtSettings.Secret
                )
            );

            var credentials = new SigningCredentials(
                key,
                SecurityAlgorithms.HmacSha256
            );

            var jwtToken = new JwtSecurityToken(
                issuer: _jwtSettings.Issuer,
                audience: _jwtSettings.Audience,
                claims: claims,
                expires: expiresAt,
                signingCredentials: credentials
            );

            var token = new JwtSecurityTokenHandler()
                .WriteToken(jwtToken);

            return (
                token,
                expiresAt
            );
        }

        // =========================================================
        // OTP
        // =========================================================

        private static string GenerateVerificationCode()
        {
            return System.Security.Cryptography.RandomNumberGenerator
                .GetInt32(100000, 1000000)
                .ToString();
        }

        // =========================================================
        // VALIDATE
        // =========================================================

        private static string? ValidateAccountInput(
            string username,
            string email,
            string phone,
            string? password,
            bool passwordRequired)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return "Tên đăng nhập không được để trống";
            }

            var normalizedUsername = username.Trim();

            if (
                normalizedUsername.Length < 4 ||
                normalizedUsername.Length > 50
            )
            {
                return "Tên đăng nhập phải từ 4 đến 50 ký tự.";
            }

            if (System.Text.RegularExpressions.Regex.IsMatch(
                    normalizedUsername,
                    @"\s"))
            {
                return "Tên đăng nhập không được chứa khoảng trắng.";
            }

            if (string.IsNullOrWhiteSpace(email))
            {
                return "Email không được để trống";
            }

            var normalizedEmail = email.Trim();

            if (!System.Text.RegularExpressions.Regex.IsMatch(
                    normalizedEmail,
                    @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
            {
                return "Email chưa đúng định dạng.";
            }

            if (string.IsNullOrWhiteSpace(phone))
            {
                return "Số điện thoại không được để trống";
            }

            var normalizedPhone = phone.Trim();

            if (!System.Text.RegularExpressions.Regex.IsMatch(
                    normalizedPhone,
                    @"^0\d{9}$"))
            {
                return "Số điện thoại phải gồm 10 số và bắt đầu bằng 0.";
            }

            if (
                passwordRequired &&
                string.IsNullOrEmpty(password)
            )
            {
                return "Mật khẩu không được để trống";
            }

            if (
                !string.IsNullOrEmpty(password) &&
                password.Length < 6
            )
            {
                return "Mật khẩu phải có ít nhất 6 ký tự";
            }

            return null;
        }

        // =========================================================
        // STATUS
        // =========================================================

        private static string? NormalizeStatus(
            string? status,
            string? defaultStatus)
        {
            var value =
                string.IsNullOrWhiteSpace(status)
                    ? defaultStatus
                    : status.Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return
                value == "active" ||
                value == "inactive"
                    ? value
                    : null;
        }

        // =========================================================
        // ROLE
        // =========================================================

        private static int? ResolveRoleId(
            AccountUpsertRequest request,
            int defaultRoleId)
        {
            if (
                request.RoleId == 1 ||
                request.RoleId == 2 ||
                request.RoleId == 3
            )
            {
                return request.RoleId;
            }

            if (string.IsNullOrWhiteSpace(request.Role))
            {
                return defaultRoleId;
            }

            return request.Role
                .Trim()
                .ToLowerInvariant()
                switch
            {
                "admin" => 1,
                "staff" => 2,
                "user" => 3,

                "1" => 1,
                "2" => 2,
                "3" => 3,

                _ => null
            };
        }

        // =========================================================
        // ROLE KEY
        // =========================================================

        private static string RoleIdToKey(
            int roleId)
        {
            return roleId switch
            {
                1 => "admin",
                2 => "staff",
                3 => "user",
                _ => "user"
            };
        }
    }

    // =============================================================
    // DTO
    // =============================================================

    public class AccountUpsertRequest
    {
        public string Username { get; set; } = "";

        public string Email { get; set; } = "";

        public string Phone { get; set; } = "";

        public string? Password { get; set; }

        public string? Role { get; set; }

        public int? RoleId { get; set; }

        public string? Status { get; set; }
    }

    public class PublicRegisterRequest
    {
        public string Username { get; set; } = "";

        public string Email { get; set; } = "";

        public string Phone { get; set; } = "";

        public string Password { get; set; } = "";
    }

    public class VerifyEmailCodeRequest
    {
        public string AccountId { get; set; } = "";

        public string Code { get; set; } = "";
    }

    public class ResendVerificationCodeRequest
    {
        public string AccountId { get; set; } = "";
    }

    public class AccountStatusRequest
    {
        public string Status { get; set; } = "";
    }
}
