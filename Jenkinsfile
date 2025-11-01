pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  environment {
    COMPOSE_FILE = 'docker-compose.yml'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Docker Build') {
      steps {
        sh '''
          docker compose build backend nginx
        '''
      }
    }

    stage('Deploy (Compose Up)') {
      steps {
        sh '''
          # 의존성 건드리지 않고 해당 서비스만 부드럽게 재기동
          docker compose up -d --no-deps backend nginx

          # (선택) DB/Redis/Mongo 변경 없으면 생략 가능
          # docker compose up -d --no-deps mysql redis mongodb
        '''
      }
    }
  }

  post {
    success {
      echo '✅ Deploy completed'
    }
    failure {
      echo '❌ Deploy failed'
    }
  }
}
