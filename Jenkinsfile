pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  environment {
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

    stage('Prepare frontend .env') {
      steps {
        sh '''
          set -e
          echo "[INFO] WORKSPACE=$(pwd)"
          echo "[INFO] listing workspace top level:"; ls -al || true

          # 1) 이미 workspace 안에 frontend/.env가 있으면 바로 통과
          if [ -f frontend/.env ]; then
            echo "[OK] frontend/.env exists in workspace"
            exit 0
          fi

          # 2) workspace에 없다면, 호스트에 실파일이 마운트되어 있는지 시도 복사
          HOST_FRONTEND_PATH=/home/ubuntu/joying/frontend
          if [ -d "$HOST_FRONTEND_PATH" ]; then
            echo "[INFO] copying host frontend -> workspace"
            rm -rf frontend || true
            mkdir -p frontend
            cp -a "$HOST_FRONTEND_PATH/." ./frontend/
            echo "[OK] copied $HOST_FRONTEND_PATH -> $(pwd)/frontend"
            # 확인
            [ -f frontend/.env ] || { echo "[WARN] copied but frontend/.env still missing"; ls -al frontend || true; exit 1; }
            exit 0
          fi

          # 3) 둘 다 없으면 실패, 상세 디버그 정보 출력
          echo "[ERR] frontend/.env not found in workspace or host path ($HOST_FRONTEND_PATH)"
          echo "[DBG] workspace listing:"; ls -al
          echo "[DBG] /home/ubuntu (host) listing (may not be mounted):"; ls -al /home || true
          exit 1
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
          export COMPOSE_PROJECT_NAME=joying

          # 현재 실행 중 컨테이너가 사용하는 이미지 ID
          OLD_IMG=$(docker inspect -f '{{.Image}}' joying-nginx 2>/dev/null || true)
          # 로컬에 빌드된 최신 이미지 ID
          NEW_IMG=$(docker images --no-trunc --quiet joying-nginx | head -n1 || true)

          echo "[INFO] old image=${OLD_IMG}"
          echo "[INFO] new image=${NEW_IMG}"

          echo "[INFO] backend만 재배포"
          docker compose --env-file .env.prod up -d --force-recreate --remove-orphans backend

          if [ -n "$NEW_IMG" ] && [ "$OLD_IMG" != "$NEW_IMG" ]; then
            echo "[INFO] nginx 이미지가 변경됨 → nginx만 무중단에 가깝게 교체"
            docker compose --env-file .env.prod up -d --no-deps --force-recreate nginx
          else
            echo "[INFO] nginx 이미지 변경 없음 → 컨테이너 유지"
            docker compose --env-file .env.prod up -d --no-deps --no-recreate nginx
          fi

          echo "[INFO] nginx 설정 문법 확인 후 reload"
          docker compose --env-file .env.prod exec -T nginx nginx -t
          docker compose --env-file .env.prod exec -T nginx nginx -s reload || docker compose --env-file .env.prod restart nginx

          echo "[INFO] compose ps"
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
