pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  environment {
    REMOTE_HOST = 'ubuntu@k13c202.p.ssafy.io'   // 또는 EC2 공인도메인/아이피
    REMOTE_DIR  = '/home/ubuntu/joying'         // 서버에서 compose가 있는 루트
    ENV_FILE_ID = 'env-prod'                    // (옵션) Jenkins 파일 크리덴셜 ID
  }

  stages {
    stage('Checkout') {
      steps {
        // 워크스페이스 깨끗하게 받고 현재 repo를 체크아웃
        deleteDir()
        checkout scm
        sh 'echo "[INFO] workspace=$(pwd)"; ls -al'
      }
    }

    stage('Sync sources to EC2') {
      steps {
        sshagent (credentials: ['ec2-ssh-key']) {
          sh '''
            echo "[INFO] Sync sources to EC2..."
            # 원격 디렉터리 보장
            ssh -o StrictHostKeyChecking=no ${REMOTE_HOST} "mkdir -p ${REMOTE_DIR}"

            # 현재 워크스페이스 전체를 tar로 전송 (git/target 등은 .dockerignore/.gitignore로 제외 권장)
            tar cz . | ssh -o StrictHostKeyChecking=no ${REMOTE_HOST} "tar xz -C ${REMOTE_DIR}"
          '''
        }
      }
    }

    stage('Upload .env.prod (if provided as Jenkins credential)') {
      steps {
        script {
          // Jenkins에 env-prod 파일 크리덴셜이 등록되어 있으면 그걸 업로드,
          // 없으면 서버에 이미 있는 ${REMOTE_DIR}/.env.prod 를 그대로 사용 (스킵)
          def hasEnv = false
          try {
            withCredentials([file(credentialsId: ENV_FILE_ID, variable: 'ENV_FILE')]) {
              hasEnv = true
              sshagent (credentials: ['ec2-ssh-key']) {
                sh '''
                  echo "[INFO] Upload .env.prod via Jenkins credential..."
                  scp -o StrictHostKeyChecking=no "$ENV_FILE" ${REMOTE_HOST}:${REMOTE_DIR}/.env.prod
                '''
              }
            }
          } catch (e) {
            echo "[WARN] Jenkins credential '${ENV_FILE_ID}' not found. Will use the .env.prod already on the server."
          }
          if (!hasEnv) {
            echo "[INFO] Skipping env upload. Using ${REMOTE_DIR}/.env.prod on server."
          }
        }
      }
    }

    stage('Preflight checks on EC2') {
      steps {
        sshagent (credentials: ['ec2-ssh-key']) {
          sh '''
            echo "[INFO] Preflight on EC2..."
            ssh -o StrictHostKeyChecking=no ${REMOTE_HOST} bash -lc '
              set -e
              cd ${REMOTE_DIR}

              # 1) 필수 파일 체크
              [ -f docker-compose.yml ] || { echo "[ERR] missing docker-compose.yml in ${REMOTE_DIR}"; exit 1; }
              [ -f .env.prod ] || { echo "[ERR] missing .env.prod in ${REMOTE_DIR}"; exit 1; }

              # 2) 인증서 존재 여부(HTTPS 쓰는 conf라면 필수)
              if grep -q "/etc/letsencrypt/live" infra/nginx.conf 2>/dev/null; then
                LIVE_DIR="${REMOTE_DIR}/certbot/conf/live/k13c202.p.ssafy.io"
                [ -f "$LIVE_DIR/fullchain.pem" ] || { echo "[ERR] $LIVE_DIR/fullchain.pem not found"; exit 1; }
                [ -f "$LIVE_DIR/privkey.pem"  ] || { echo "[ERR] $LIVE_DIR/privkey.pem not found";  exit 1; }
                echo "[OK] cert files exist."
              else
                echo "[INFO] nginx.conf does not use /etc/letsencrypt/live path. Skipping cert check."
              fi

              # 3) 포트 충돌 점검 (80/443)
              CONFLICT=$(ss -ltnp | egrep ":80\\s|:443\\s" || true)
              if [ -n "$CONFLICT" ]; then
                echo "[WARN] Port 80/443 in use:"
                echo "$CONFLICT"
              fi

              echo "[OK] Preflight done."
            '
          '''
        }
      }
    }

    stage('Deploy on EC2 (docker compose up)') {
      steps {
        sshagent (credentials: ['ec2-ssh-key']) {
          sh '''
            echo "[INFO] Compose up on EC2..."
            ssh -o StrictHostKeyChecking=no ${REMOTE_HOST} bash -lc '
              set -e
              cd ${REMOTE_DIR}

              # nginx conf 문법 먼저 검사(실패시 명확한 에러)
              docker run --rm \
                -v "$PWD/infra/nginx.conf:/etc/nginx/nginx.conf:ro" \
                -v "$PWD/certbot/conf:/etc/letsencrypt:ro" \
                -v "$PWD/certbot/www:/var/www/certbot:ro" \
                nginx:alpine nginx -t

              # 실제 배포 (backend, nginx만 교체)
              docker compose --env-file .env.prod up -d --build --force-recreate --no-deps backend nginx

              echo "[INFO] Tail nginx logs (30s)..."
              docker compose logs --since=30s nginx || true
            '
          '''
        }
      }
    }
  }

  post {
    success { echo '✅ Deploy completed' }
    failure { echo '❌ Deploy failed' }
  }
}
