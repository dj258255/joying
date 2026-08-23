# 배포

서버에 올릴 값을 여기서 만든다.

## 왜 이렇게 하나

Jenkins 를 쓸 때는 서버에 `.env.prod` 를 사람이 손으로 올려 두고 파이프라인이 그것을
복사했다. 그 파일이 어디서 왔는지, 무엇이 들었는지, 누가 언제 바꿨는지 저장소에 남지
않았다. 서버를 새로 만들면 그 파일부터 다시 만들어야 했다.

이제 값은 vault 에 암호화해 저장소에 두고, 배포할 때 서버에서 `.env` 를 만든다.
**서버에 사람이 미리 놓아 두어야 하는 파일이 없다.**

## 비밀을 넣고 꺼내기

```bash
# 처음 만들 때
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

**비밀과 비밀이 아닌 것을 파일로 나눈 이유**는 vault 를 열지 않고도 설정을 읽을 수
있게 하기 위해서다. 전부 암호화하면 포트 하나 확인하려고 매번 암호를 넣어야 한다.

`vars.yml` 은 vault 안의 값을 이름으로 가리킨다. 그래서 `.env` 를 만드는 템플릿은
한 곳만 보면 된다.
