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
          # joying_* 네트워크 중에서 우선 joying_joying-network, 없으면 joying_default 탐색
          NET=$(docker network ls --format "{{.Name}}" | grep -E "^joying_joying-network$|^joying(_default)?$" | head -n1)
          if [ -z "$NET" ]; then
            echo "[ERR] joying docker network not found"; docker network ls; exit 1
          fi
          echo "[INFO] using docker network: $NET"

          docker run --rm \
            --network "$NET" \
            --volumes-from joying-jenkins \
            -v /home/ubuntu/joying/certbot/conf:/etc/letsencrypt:ro \
            -v /home/ubuntu/joying/certbot/www:/var/www/certbot:ro \
            nginx:alpine \
            nginx -t -c /var/jenkins_home/workspace/joying/infra/nginx.conf
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

          echo "[INFO] hard-refresh compose for backend, nginx"
          # 0) 프로젝트명 고정(이름 충돌 방지)
          export COMPOSE_PROJECT_NAME=joying

          # 1) 충돌 방지: 같은 이름의 컨테이너/오브젝트 먼저 정리
          docker compose --env-file .env.prod stop nginx || true
          docker compose --env-file .env.prod rm -f nginx || true

          # 2) 의존성까지 정상 재작성 (no-deps 제거, remove-orphans 추가)
          docker compose --env-file .env.prod up -d --force-recreate --remove-orphans backend nginx

          echo "[INFO] compose ps"
          docker compose --env-file .env.prod ps

          echo "[INFO] nginx first 15s logs (may be empty if started clean)"
          docker compose --env-file .env.prod logs --since=15s nginx || true

          # 3) 만약 nginx가 'created'면 강제 재시도(NG 원인 추적을 위해 상태/오류 출력)
          NSTATE=$(docker ps -a --filter "name=nginx" --format "{{.Names}} {{.State}}" | awk '/nginx/ {print $2}')
          if [ "$NSTATE" = "created" ] || [ -z "$NSTATE" ]; then
            echo "[WARN] nginx state=$NSTATE → force recreate once"
            docker compose --env-file .env.prod rm -f nginx || true
            docker compose --env-file .env.prod up -d --force-recreate --remove-orphans nginx || true
            docker ps -a --filter "name=nginx"
            echo "[DIAG] docker inspect (State & Error)"
            docker inspect $(docker ps -a --filter "name=nginx" --format "{{.ID}}") \
              --format 'Name={{.Name}} State={{.State.Status}} Error={{.State.Error}} Started={{.State.StartedAt}} Finished={{.State.FinishedAt}}'
          fi

          # 4) 최종 상태 요약
          echo "[INFO] final ps"
          docker compose --env-file .env.prod ps
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
        docker compose --env-file .env.prod ps || true
        docker compose --env-file .env.prod logs --tail=200 nginx || true
      '''
    }
  }
}
