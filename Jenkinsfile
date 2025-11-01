pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  environment {
    // 배포에 쓸 호스트 고정 경로 (certbot 같이 리포지토리에 없는 자원 보관)
    RUNTIME_BASE = '/home/ubuntu/joying-runtime'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Debug print (where am I)') {
      steps {
        sh '''
          echo "[INFO] WORKSPACE = $WORKSPACE"
          ls -al
          [ -f docker-compose.yml ] && echo "[INFO] docker-compose.yml exists" || (echo "[ERR] no docker-compose.yml" && exit 1)
        '''
      }
    }

    stage('Prepare .env') {
      steps {
        sh '''
          set -e
          SRC_ENV="/run/secrets/env.prod"
          if [ ! -f "$SRC_ENV" ]; then
            echo "[ERROR] $SRC_ENV 가 없습니다."; exit 1
          fi
          cp "$SRC_ENV" .env.prod
          echo "[INFO] .env.prod 준비 완료 (workspace=$(pwd))"
        '''
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          # 워크스페이스 기준으로 build
          docker compose -f "$WORKSPACE/docker-compose.yml" \
                         --project-directory "$WORKSPACE" \
                         build backend nginx
        '''
      }
    }

    stage('Deploy (Compose Up)') {
      steps {
        sh '''
          set -e

          echo "[INFO] Deploying with compose at $WORKSPACE"

          # certbot 고정 자원은 호스트 절대경로로 준비(최초 1회만 만들어짐)
          mkdir -p "$RUNTIME_BASE/certbot/conf" "$RUNTIME_BASE/certbot/www"

          # compose 파일이 certbot을 상대경로로 잡아놨다면, 절대경로로 바꾸는게 안전
          # (권장) docker-compose.yml에서 아래처럼 변경해둬:
          #   - /home/ubuntu/joying-runtime/certbot/www:/var/www/certbot:rw
          #   - /home/ubuntu/joying-runtime/certbot/conf:/etc/letsencrypt:rw

          docker compose -f "$WORKSPACE/docker-compose.yml" \
                         --project-directory "$WORKSPACE" \
                         up -d --no-deps backend nginx
        '''
      }
    }
  }

  post {
    success { echo '✅ Deploy completed' }
    failure { echo '❌ Deploy failed' }
  }
}
