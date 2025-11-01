pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Where am I') {
      steps {
        sh '''
          echo "[INFO] WORKSPACE = $WORKSPACE"
          ls -al
          [ -f docker-compose.yml ] || { echo "[ERR] no docker-compose.yml in $PWD"; exit 1; }
        '''
      }
    }

    // ★ .env 가져오기: 컨테이너 마운트(/run/secrets/env.prod) 우선, 없으면 호스트 경로 폴백
    stage('Prepare .env') {
      steps {
        sh '''
          set -e
          if [ -f /run/secrets/env.prod ]; then
            SRC_ENV="/run/secrets/env.prod"
          elif [ -f /home/ubuntu/joying/.env.prod ]; then
            SRC_ENV="/home/ubuntu/joying/.env.prod"
          else
            echo "[ERROR] .env.prod not found at /run/secrets/env.prod or /home/ubuntu/joying/.env.prod"
            echo "[HINT] If running inside Jenkins container, mount host file:"
            echo "       - /home/ubuntu/joying/.env.prod:/run/secrets/env.prod:ro"
            exit 1
          fi

          echo "[INFO] Using SRC_ENV=$SRC_ENV"
          cp "$SRC_ENV" .env.prod
          # compose 변수 치환 경고 제거용 (.env도 같이 둠)
          cp "$SRC_ENV" .env

          echo "[INFO] Prepared .env & .env.prod in workspace:"
          ls -l .env .env.prod
        '''
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          # 워크스페이스 기준으로 build (compose가 .env 자동 읽음)
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
          docker compose -f "$WORKSPACE/docker-compose.yml" \
                         --project-directory "$WORKSPACE" \
                         up -d --no-deps backend nginx

          echo "[INFO] Services status:"
          docker compose -f "$WORKSPACE/docker-compose.yml" --project-directory "$WORKSPACE" ps
        '''
      }
    }
  }

  post {
    success { echo '✅ Deploy completed' }
    failure { echo '❌ Deploy failed' }
  }
}
