pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  environment {
    // Jenkins 컨테이너에 마운트된 호스트 .env.prod (docker-compose.yml의 변수 치환용)
    ENV_FILE    = '/run/secrets/env.prod'
  }

  stages {
    stage('Checkout') {
      steps {
        deleteDir()
        checkout scm
        sh '''
          echo "[INFO] workspace=$(pwd)"
          ls -al
          [ -f docker-compose.yml ] || { echo "[ERR] missing docker-compose.yml"; exit 1; }
        '''
      }
    }

    stage('Prepare .env') {
      steps {
        sh '''
          set -e
          [ -f "$ENV_FILE" ] || { echo "[ERR] $ENV_FILE not found (host .env.prod not mounted)"; exit 1; }
          cp "$ENV_FILE" .env.prod
          echo "[OK] copied $ENV_FILE -> $(pwd)/.env.prod"
          echo "[INFO] preview .env.prod (safe keys oculted)"; grep -E '^(MYSQL|REDIS|MONGO|JWT|OAUTH2|CLOUDFLARE|SSAFY|CORS|FORCE_HTTPS|LOGGING|MONGODB|REDIS|MYSQL)_' .env.prod | sed 's/=.*/=***hidden***/'
        '''
      }
    }

    stage('Preflight: nginx.conf 문법&볼륨 검사') {
      steps {
        sh '''
          set -e
          # nginx 문법 체크를 컨테이너로 사전 검증 (여기서 실패하면 "created에서 멈춤"의 원인 확정)
          docker run --rm \
            -v "$PWD/infra/nginx.conf:/etc/nginx/nginx.conf:ro" \
            -v "/home/ubuntu/joying/certbot/conf:/etc/letsencrypt:ro" \
            -v "/home/ubuntu/joying/certbot/www:/var/www/certbot:ro" \
            nginx:alpine nginx -t
        '''
      }
    }

    stage('Build images') {
      steps {
        sh '''
          set -e
          # compose 파일 변수 치환을 위해 --env-file 명시
          docker compose --env-file .env.prod build backend nginx
        '''
      }
    }

    stage('Deploy (compose up)') {
      steps {
        sh '''
          set -e
          echo "[INFO] compose up backend, nginx"
          docker compose --env-file .env.prod up -d --no-deps --force-recreate backend nginx

          echo "[INFO] compose ps"
          docker compose ps

          echo "[INFO] recent nginx logs (20s)"
          docker compose logs --since=20s nginx || true
        '''
      }
    }
  }

  post {
    success { echo '✅ Deploy completed' }
    failure {
      echo '❌ Deploy failed'
      sh '''
        echo "[DIAG] nginx status & last logs"
        docker compose ps || true
        docker compose logs --tail=200 nginx || true
      '''
    }
  }
}
