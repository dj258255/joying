pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Prepare .env') {
      steps {
        sh '''
          set -e
          # Jenkins 컨테이너 안에는 /run/secrets/env.prod 로 볼 수 있음
          if [ ! -f /run/secrets/env.prod ]; then
            echo "[ERROR] /run/secrets/env.prod 가 없습니다."
            exit 1
          fi
          # docker compose는 현재 디렉토리 기준으로 .env 파일을 읽으므로 복사
          cp /run/secrets/env.prod "$WORKSPACE/.env.prod"
          echo "[INFO] .env.prod copied into workspace"
        '''
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          docker compose -f "$WORKSPACE/docker-compose.yml" \
                         --project-directory "$WORKSPACE" \
                         build backend nginx
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh '''
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
