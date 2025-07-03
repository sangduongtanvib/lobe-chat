# Fix SSL Termination Issues với Azure Application Gateway

Khi sử dụng **Azure Application Gateway** với SSL termination, bạn có thể gặp lỗi SSL trong container logs và 500 errors trên browser. Đây là các cách fix:

## 1. Environment Variables (Khuyên dùng)

### Container Environment Variables:

```bash
# Trust proxy headers từ Azure Application Gateway
TRUST_PROXY=true

# Force HTTPS protocol awareness
FORCE_HTTPS=true

# Chỉ dùng trong development/testing - KHÔNG dùng production
# NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Docker Compose:

```yaml
services:
  lobe-chat:
    image: lobehub/lobe-chat
    environment:
      - TRUST_PROXY=true
      - FORCE_HTTPS=true
      - HOSTNAME=0.0.0.0
      - PORT=3210
      # NextAuth URL với HTTPS
      - NEXTAUTH_URL=https://yourdomain.com
```

### Docker Run:

```bash
docker run -d \
  -e TRUST_PROXY=true \
  -e FORCE_HTTPS=true \
  -e NEXTAUTH_URL=https://yourdomain.com \
  -p 3210:3210 \
  lobehub/lobe-chat
```

## 2. Fix Self-Signed Certificate Issues

Nếu gặp lỗi `SELF_SIGNED_CERT_IN_CHAIN`:

```bash
# Allow self-signed certificates (ONLY in development/testing)
NODE_TLS_REJECT_UNAUTHORIZED=0

# Combine với DISABLE_WAF để test
DISABLE_WAF=true
NODE_TLS_REJECT_UNAUTHORIZED=0
```

## 3. Tắt WAF tạm thời để test

Nếu nghi ngờ WAF rewrites gây vấn đề:

```bash
# Tắt WAF
DISABLE_WAF=true
```

## 4. Azure Application Gateway Requirements

Đảm bảo Azure Application Gateway gửi đúng headers:

### Required Headers:

- `X-Forwarded-Proto: https`
- `X-Forwarded-Host: yourdomain.com`
- `X-Forwarded-For: client-ip`
- `Host: yourdomain.com`

### Backend Pool Settings:

- **Protocol**: HTTP (không phải HTTPS)
- **Port**: 3210
- **Health Probe**: HTTP với path `/api/health` hoặc `/`

### SSL Settings:

- **SSL Termination**: Tại Application Gateway
- **Backend SSL**: Disabled
- **Cookie-based session affinity**: Enabled (nếu cần)

## 5. Testing Commands

### Test container internal:

```bash
# Test HTTP internally
docker exec -it lobe-chat-container curl http://localhost:3210/api/health

# Test với headers
docker exec -it lobe-chat-container curl \
  -H "X-Forwarded-Proto: https" \
  -H "X-Forwarded-Host: yourdomain.com" \
  http://localhost:3210/
```

### Test rewrites:

```bash
# Test font rewrites
curl -k https://yourdomain.com/api/fonts/webfont-mono

# Test emoji rewrites
curl -k https://yourdomain.com/api/emojis/1f600.webp
```

### Check logs:

```bash
# Container logs
docker logs lobe-chat-container | grep -i ssl

# Middleware logs
docker logs lobe-chat-container | grep -i middleware
```

## 6. Common Issues & Solutions

### Issue: Mixed Content Errors

**Giải pháp**: Đảm bảo `X-Forwarded-Proto: https` header được gửi

### Issue: Infinite Redirects

**Giải pháp**: Kiểm tra `NEXTAUTH_URL` phải là HTTPS

### Issue: 500 Errors trên static files

**Giải pháp**: Set `DISABLE_WAF=true` để test

### Issue: Cookies không work

**Giải pháp**: Đảm bảo `secure` flag được set đúng với HTTPS

## 7. Debug Mode

Để debug chi tiết:

```bash
# Enable debug logs
DEBUG=lobe-middleware* npm start

# Hoặc trong Docker
docker run -e DEBUG=lobe-middleware* lobehub/lobe-chat
```

## 8. Production vs Development

### Development:

```bash
TRUST_PROXY=true
FORCE_HTTPS=false
NODE_TLS_REJECT_UNAUTHORIZED=0 # OK for dev
```

### Production:

```bash
TRUST_PROXY=true
FORCE_HTTPS=true
# KHÔNG set NODE_TLS_REJECT_UNAUTHORIZED=0
```

## 9. Verification

Sau khi apply fix, verify:

1. ✅ Container logs không có SSL errors
2. ✅ Browser không có 500 errors
3. ✅ Static files (fonts, images) load OK
4. ✅ Authentication works
5. ✅ Rewrites hoạt động đúng

---

**Lưu ý**: Azure Application Gateway thường configure SSL termination đúng, vấn đề chủ yếu là container không biết original request là HTTPS. Fix này giúp container nhận diện và xử lý đúng protocol.
