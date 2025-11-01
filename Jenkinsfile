pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  environment {
    REMOTE_HOST = 'k13c202.p.ssafy.io'        // EC2 도메인/공인IP
    REMOTE_DIR  = '/home/ubuntu/joying'       // 서버 docker-compose.yml 위치
    ENV_FILE_ID = 'env-prod'                  // (선택) Jenkins 파일 크리덴셜 ID (없으면 서버 .env.prod 사용)
  }

  stages {
    stage('Checkout') {
      steps {
        deleteDir()
        checkout scm
        sh 'echo "[INFO] workspace=$(pwd)"; ls -al'
      }
    }

    stage('Sync sources to EC2') {
      steps {
        withCredentials([
          sshUserPrivateKey(credentialsId: 'ec2-ssh-key',
                            keyFileVariable: 'SSH_KEY',
                            usernameVariable: 'SSH_USER',
                            passphraseVariable: 'SSH_PASSPHRASE')
        ]) {
          sh '''
            set -e
            echo "[INFO] Sync sources to EC2..."
            # 원격 디렉토리 보장
            ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@${REMOTE_HOST}" "mkdir -p ${REMOTE_DIR}"

            # 소스 전체 전송 (tar 스트림)
            tar cz . | ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@${REMOTE_HOST}" "tar xz -C ${REMOTE_DIR}"
          '''
        }
      }
    }

    stage('Upload .env.prod (if Jenkins credential exists)') {
      steps {
        script {
          def uploaded = false
          try {
            withCredentials([file(credentialsId: ENV_FILE_ID, variable: 'ENV_FILE')]) {
              uploaded = true
              withCredentials([
                sshUserPrivateKey(credentialsId: 'ec2-ssh-key',
                                  keyFileVariable: 'SSH_KEY',
                                  usernameVariable: 'SSH_USER',
                                  passphraseVariable: 'SSH_PASSPHRASE')
              ]) {
                sh '''
                  set -e
                  echo "[INFO] Upload .env.prod from Jenkins credential..."
                  scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "$ENV_FILE" "$SSH_USER@${REMOTE_HOST}:${REMOTE_DIR}/.env.prod"
                '''
              }
            }
          } catch (ignored) {
            echo "[WARN] Jenkins credential '${ENV_FILE_ID}' not found. Using existing ${REMOTE_DIR}/.env.prod on server."
          }
        }
      }
    }

    stage('Preflight checks on EC2') {
      steps {
        withCredentials([
          sshUserPrivateKey(credentialsId: 'ec2-ssh-key',
                            keyFileVariable: 'SSH_KEY',
                            usernameVariable: 'SSH_USER',
                            passphraseVariable: 'SSH_PASSPHRASE')
        ]) {
          sh '''
            set -e
            echo "[INFO] Preflight on EC2..."
            ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@${REMOTE_HOST}" bash -lc '
              set -e
              cd ${REMOTE_DIR}

              # 필수 파일
              [ -f docker-compose.yml ] || { echo "[ERR] missing docker-compose.yml"; exit 1; }
              [ -f .env.prod ] || { echo "[ERR] missing .env.prod"; exit 1; }

              # 인증서 경로 검사 (nginx.conf가 live 경로 사용시)
              if grep -q "/etc/letsencrypt/live" infra/nginx.conf 2>/dev/null; then
                LIVE_DIR="${REMOTE_DIR}/certbot/conf/live/k13c202.p.ssafy.io"
                [ -f "$LIVE_DIR/fullchain.pem" ] || { echo "[ERR] $LIVE_DIR/fullchain.pem not found"; exit 1; }
                [ -f "$LIVE_DIR/privkey.pem"  ] || { echo "[ERR] $LIVE_DIR/privkey.pem not found";  exit 1; }
                echo "[OK] cert files exist."
              else
                echo "[INFO] nginx.conf does not reference /etc/letsencrypt/live. Skipping cert presence check."
              fi

              # 80/443 포트 점유 경고만
              ss -ltnp | egrep ":80\\s|:443\\s" || true
            '
          '''
        }
      }
    }

    stage('Deploy on EC2 (compose up)') {
      steps {
        withCredentials([
          sshUserPrivateKey(credentialsId: 'ec2-ssh-key',
                            keyFileVariable: 'SSH_KEY',
                            usernameVariable: 'SSH_USER',
                            passphraseVariable: 'SSH_PASSPHRASE')
        ]) {
          sh '''
            set -e
            echo "[INFO] Compose up on EC2..."
            ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" "$SSH_USER@${REMOTE_HOST}" bash -lc '
              set -e
              cd ${REMOTE_DIR}

              # (중요) nginx.conf 문법 사전검증 — 여기서 터지면 created에서 멈추는 원인 바로 드러남
              docker run --rm \
                -v "$PWD/infra/nginx.conf:/etc/nginx/nginx.conf:ro" \
                -v "$PWD/certbot/conf:/etc/letsencrypt:ro" \
                -v "$PWD/certbot/www:/var/www/certbot:ro" \
                nginx:alpine nginx -t

              # backend/nginx만 교체 배포
              docker compose --env-file .env.prod up -d --build --force-recreate --no-deps backend nginx

              echo "[INFO] Tail nginx logs (30s)…"
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
