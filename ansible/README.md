# 배포

서버에 올릴 값을 여기서 만든다.

## 왜 이렇게 하나

Jenkins 를 쓸 때는 서버에 `.env.prod` 를 사람이 손으로 올려 두고 파이프라인이 그것을
복사했다. 그 파일이 어디서 왔는지, 무엇이 들었는지, 누가 언제 바꿨는지 저장소에 남지
않았다. 서버를 새로 만들면 그 파일부터 다시 만들어야 했다.

이제 값은 vault 에 암호화해 저장소에 두고, 배포할 때 서버에서 `.env` 를 만든다.
**서버에 사람이 미리 놓아 두어야 하는 파일이 없다.**

## 처음 준비할 때

```bash
scripts/init-secrets.sh
```

만들 수 있는 값(JWT 열쇠, 저장소 암호, 웹 푸시 열쇠 쌍)은 스크립트가 만들고, 밖에서
받아 와야 하는 값(토스, 카카오, Cloudflare)만 물어본다. 물어보는 값은 화면에 찍지
않는다. **값은 이 기계 밖으로 나가지 않는다.**

끝나면 GitHub 시크릿에 넣을 명령을 알려 준다. 그 명령도 값을 로그에 남기지 않는
모양으로 되어 있다.

## 비밀을 넣고 꺼내기

```bash
# 처음 만들 때 (스크립트를 안 쓰고 손으로 할 때)
ansible-vault create ansible/group_vars/all/vault.yml

# 고칠 때
ansible-vault edit ansible/group_vars/all/vault.yml

# 열어 보기만
ansible-vault view ansible/group_vars/all/vault.yml
```

암호는 저장소에 두지 않는다. 로컬에서는 물어보게 두고, GitHub Actions 에서는
`ANSIBLE_VAULT_PASSWORD` 시크릿으로 넣는다.

## 배포

```bash
ansible-playbook -i ansible/inventory/prod.ini ansible/deploy.yml --ask-vault-pass
```

## 무엇이 어디에 있나

| 파일 | 무엇 |
|---|---|
| `inventory/prod.ini` | 어느 서버에 올릴지 |
| `group_vars/all/vars.yml` | 비밀이 아닌 값. 그대로 읽힌다 |
| `group_vars/all/vault.yml` | 비밀. 암호화돼 있다 |
| `templates/env.j2` | 서버에 만들 `.env` 의 모양 |
| `deploy.yml` | 받아서 빌드하고 띄우는 순서 |
| `../scripts/init-secrets.sh` | 비밀을 만들어 vault 에 넣는다 |

**비밀과 비밀이 아닌 것을 파일로 나눈 이유**는 vault 를 열지 않고도 설정을 읽을 수
있게 하기 위해서다. 전부 암호화하면 포트 하나 확인하려고 매번 암호를 넣어야 한다.

`vars.yml` 은 vault 안의 값을 이름으로 가리킨다. 그래서 `.env` 를 만드는 템플릿은
한 곳만 보면 된다.

## 첫 인증서

앞단은 인증서 파일이 없으면 뜨지 않는다. 그런데 `certbot` 은 **갱신만** 하고 최초 발급을
하지 않는다. 서버를 새로 만들면 아무도 첫 인증서를 만들지 않고, **앞단이 떠야 certbot 이
인증을 받을 수 있어 서로를 기다린다.**

배포가 자체 서명한 것을 자리에 놓아 그 고리를 끊는다. 앞단은 뜨지만 **브라우저가
경고한다.** 진짜 인증서를 한 번 받아야 한다.

```bash
# 서버에서 한 번만. 도메인이 이 서버를 가리키고 80 포트가 열려 있어야 한다
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d k13c202.p.ssafy.io --agree-tos -m <메일> --no-eff-email

docker compose exec nginx nginx -s reload
```

그 뒤로는 compose 의 `certbot` 이 12시간마다 갱신한다. 자체 서명한 것은 진짜 인증서가
같은 자리에 덮어쓰므로 따로 지우지 않아도 된다.

## 서버 없이 리허설하기

배포가 실제로 도는지는 서버가 있어야만 알 수 있는 것이 아니다. 이 기계를 대상으로
잡으면 `git` 받기부터 건강 확인까지 그대로 지난다.

```bash
# 대상을 이 기계로 잡는다
cat > /tmp/rehearsal.ini <<'INI'
[joying]
localhost ansible_connection=local
INI

# vault 대신 쓸 값. 진짜 비밀을 넣지 않는다
#   - JWT 는 32바이트 미만이면 기동이 막힌다
#   - 웹 푸시 키는 아무 글자나 넣으면 안 된다. init-secrets.sh 와 같은 방법으로 만든다
ansible-playbook -i /tmp/rehearsal.ini ansible/deploy.yml \
  -e @/tmp/rehearsal-vault.yml \
  -e app_dir=/tmp/joying-rehearsal \
  -e repo_url="$(pwd)" \
  -e deploy_ref=develop
```

끝나면 `배포 완료. 상태 확인 응답 200` 이 찍힌다. 치우려면 `app_dir` 에서
`docker compose --env-file .env down -v` 를 한다.

### 여기서 확인되지 않는 것

**진짜 인증서로는 확인되지 않는다.** 리허설에서 앞단은 자체 서명한 임시 인증서로 뜬다.
Let's Encrypt 가 실제로 발급해 주는지는 도메인이 그 서버를 가리켜야 알 수 있다.

**받는 코드는 커밋된 것이다.** 고친 것을 커밋하지 않고 돌리면 예전 코드가 배포된다.
리허설에서 같은 오류가 두 번 난 뒤에 알았다.
