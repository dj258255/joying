#!/usr/bin/env bash
#
# 배포에 필요한 비밀을 한 번에 준비한다.
#
#   scripts/init-secrets.sh
#
# 하는 일:
#   1. 만들 수 있는 값은 여기서 만든다 (JWT 열쇠, 저장소 암호, 웹 푸시 열쇠)
#   2. 밖에서 받아 와야 하는 값은 물어본다 (토스, 카카오, Cloudflare)
#   3. ansible-vault 로 암호화해 ansible/group_vars/all/vault.yml 에 넣는다
#   4. GitHub 시크릿에 넣는 명령을 알려 준다
#
# 값은 이 기계 밖으로 나가지 않는다. 물어보는 값은 화면에 찍지 않는다.
#
set -euo pipefail

cd "$(dirname "$0")/.."

VAULT_FILE="ansible/group_vars/all/vault.yml"
TEMPLATE="ansible/group_vars/all/vault.yml.example"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[막힘] $1 이 필요하다"; exit 1; }
}
need openssl
need ansible-vault

if [ -f "$VAULT_FILE" ]; then
  echo "[막힘] $VAULT_FILE 이 이미 있다."
  echo "       고치려면: ansible-vault edit $VAULT_FILE"
  echo "       새로 만들려면 먼저 지워라. 지우면 지금 값은 되찾을 수 없다."
  exit 1
fi

echo "== 1. 만들 수 있는 값을 만든다 =="

# JWT 열쇠는 최소 32바이트여야 한다. 짧으면 기동할 때 막힌다
JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
POSTGRES_PASSWORD="$(openssl rand -base64 24 | tr -d '\n=/+' | cut -c1-24)"
REDIS_PASSWORD="$(openssl rand -base64 24 | tr -d '\n=/+' | cut -c1-24)"
ELASTIC_PASSWORD="$(openssl rand -base64 24 | tr -d '\n=/+' | cut -c1-24)"
echo "   JWT 열쇠, PostgreSQL·Redis·Elasticsearch 암호를 만들었다"

# 웹 푸시는 P-256 키 쌍이 필요하다. 브라우저에 공개 열쇠를 주고 서버가 개인 열쇠로 서명한다
VAPID_DIR="$(mktemp -d)"
trap 'rm -rf "$VAPID_DIR"' EXIT
openssl ecparam -name prime256v1 -genkey -noout -out "$VAPID_DIR/vapid.pem" 2>/dev/null
WEB_PUSH_PRIVATE_KEY="$(openssl ec -in "$VAPID_DIR/vapid.pem" -outform DER 2>/dev/null \
  | tail -c +8 | head -c 32 | base64 | tr '+/' '-_' | tr -d '=\n')"
WEB_PUSH_PUBLIC_KEY="$(openssl ec -in "$VAPID_DIR/vapid.pem" -pubout -outform DER 2>/dev/null \
  | tail -c 65 | base64 | tr '+/' '-_' | tr -d '=\n')"
echo "   웹 푸시 열쇠 쌍을 만들었다"

echo
echo "== 2. 밖에서 받아 와야 하는 값을 묻는다 =="
echo "   비워 두면 그 기능만 안 된다. 나중에 ansible-vault edit 으로 채울 수 있다."
echo "   입력한 값은 화면에 찍히지 않는다."
echo

ask() {
  local prompt="$1" var
  read -r -s -p "   ${prompt}: " var
  echo
  printf '%s' "$var"
}

TOSS_SECRET_KEY="$(ask '토스페이먼츠 시크릿 키')"
KAKAO_CLIENT_ID="$(ask '카카오 REST API 키')"
KAKAO_CLIENT_SECRET="$(ask '카카오 시크릿')"
CLOUDFLARE_R2_ACCESS_KEY="$(ask 'Cloudflare R2 액세스 키')"
CLOUDFLARE_R2_SECRET_KEY="$(ask 'Cloudflare R2 시크릿 키')"
CLOUDFLARE_R2_ENDPOINT="$(ask 'Cloudflare R2 엔드포인트')"
CLOUDFLARE_R2_BUCKET="$(ask 'Cloudflare R2 버킷 이름')"
CLOUDFLARE_R2_PUBLIC_BASE_URL="$(ask 'Cloudflare R2 공개 주소')"

# 금융망은 실 API 가 사라져 기본이 꺼져 있다. 비워 둔다
SSAFY_FINANCE_API_KEY=""
SSAFY_ESCROW_ACCOUNT_NO=""
SSAFY_ESCROW_USER_KEY=""

echo
echo "== 3. vault 로 암호화한다 =="

TMP="$(mktemp)"
chmod 600 "$TMP"
trap 'rm -rf "$VAPID_DIR" "$TMP"' EXIT

# 값에 따옴표가 들어가도 깨지지 않게 감싼다
q() { printf '%s' "$1" | sed "s/'/''/g"; }

cat > "$TMP" <<EOF
# scripts/init-secrets.sh 가 만들었다. 고칠 때는 ansible-vault edit 을 쓴다.
vault_jwt_secret: '$(q "$JWT_SECRET")'
vault_postgres_password: '$(q "$POSTGRES_PASSWORD")'
vault_redis_password: '$(q "$REDIS_PASSWORD")'
vault_elastic_password: '$(q "$ELASTIC_PASSWORD")'
vault_kakao_client_id: '$(q "$KAKAO_CLIENT_ID")'
vault_kakao_client_secret: '$(q "$KAKAO_CLIENT_SECRET")'
vault_toss_secret_key: '$(q "$TOSS_SECRET_KEY")'
vault_cloudflare_r2_access_key: '$(q "$CLOUDFLARE_R2_ACCESS_KEY")'
vault_cloudflare_r2_secret_key: '$(q "$CLOUDFLARE_R2_SECRET_KEY")'
vault_cloudflare_r2_endpoint: '$(q "$CLOUDFLARE_R2_ENDPOINT")'
vault_cloudflare_r2_bucket: '$(q "$CLOUDFLARE_R2_BUCKET")'
vault_cloudflare_r2_public_base_url: '$(q "$CLOUDFLARE_R2_PUBLIC_BASE_URL")'
vault_web_push_public_key: '$(q "$WEB_PUSH_PUBLIC_KEY")'
vault_web_push_private_key: '$(q "$WEB_PUSH_PRIVATE_KEY")'
vault_ssafy_finance_api_key: '$(q "$SSAFY_FINANCE_API_KEY")'
vault_ssafy_escrow_account_no: '$(q "$SSAFY_ESCROW_ACCOUNT_NO")'
vault_ssafy_escrow_user_key: '$(q "$SSAFY_ESCROW_USER_KEY")'
EOF

# 템플릿에 있는 이름이 전부 들어갔는지 본다. 빠지면 배포할 때 변수를 못 찾는다
missing=""
while read -r name; do
  grep -q "^${name}:" "$TMP" || missing="$missing $name"
done < <(grep -oE '^vault_[a-z0-9_]+' "$TEMPLATE")
if [ -n "$missing" ]; then
  echo "[막힘] 빠진 값이 있다:$missing"
  exit 1
fi

cp "$TMP" "$VAULT_FILE"
echo "   vault 암호를 정한다. 이 암호는 저장소에 올리지 않는다."
ansible-vault encrypt "$VAULT_FILE"

echo
echo "== 4. 확인 =="
if grep -q '^\$ANSIBLE_VAULT' "$VAULT_FILE"; then
  echo "   $VAULT_FILE 이 암호화됐다"
else
  echo "[막힘] 암호화되지 않았다. 파일을 지우고 다시 하라"
  exit 1
fi
if git check-ignore -q "$VAULT_FILE" 2>/dev/null; then
  echo "[경고] $VAULT_FILE 이 .gitignore 에 걸려 있다. 암호화된 채로 올라가야 한다"
fi

echo
echo "== 5. 남은 것 =="
cat <<'GUIDE'
   GitHub 시크릿 세 개를 넣어야 배포가 돈다. 값이 로그에 남지 않게 파일이나
   입력으로 넣는다.

     gh secret set ANSIBLE_VAULT_PASSWORD          # 방금 정한 vault 암호
     gh secret set DEPLOY_SSH_KEY < ~/.ssh/id_ed25519
     ssh-keyscan -H k13c202.p.ssafy.io | gh secret set DEPLOY_KNOWN_HOSTS

   넣은 뒤 확인:

     gh secret list

   그다음 배포:

     git push origin main
     # 또는 GitHub Actions 에서 "배포" 워크플로를 직접 실행

   손으로 먼저 돌려 보려면:

     ansible-playbook -i ansible/inventory/prod.ini ansible/deploy.yml --ask-vault-pass
GUIDE
