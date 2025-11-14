pipeline {
  agent any
  options { timestamps(); disableConcurrentBuilds() }

  environment {
    ENV_FILE    = '/run/secrets/env.prod'
  }

  stages {
    stage('Check Branch') {
      steps {
        script {
          def branchName = env.GIT_BRANCH ?: 'unknown'
          echo "[INFO] Current branch: ${branchName}"

          // develop 또는 master/main 브랜치만 빌드
          if (!(branchName.contains('develop') || branchName.contains('master') || branchName.contains('main'))) {
            echo "[SKIP] This pipeline only runs on 'develop', 'master', or 'main' branch."
            echo "[SKIP] Current branch: ${branchName}"
            currentBuild.result = 'NOT_BUILT'
            error("Skipping build for branch: ${branchName}")
          }
          echo "[OK] Branch check passed. Proceeding with build..."
        }
      }
    }

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

    stage('Prepare frontend .env & Copy Host Files') {
      steps {
        sh '''
          set -e
          echo "[INFO] WORKSPACE=$(pwd)"

          HOST_FRONTEND_PATH=/home/ubuntu/joying/frontend

          # 1) 호스트에서 전체 frontend 폴더 복사
          if [ -d "$HOST_FRONTEND_PATH" ]; then
            echo "[INFO] copying host frontend -> workspace"
            rm -rf frontend || true
            mkdir -p frontend
            cp -a "$HOST_FRONTEND_PATH/." ./frontend/
            echo "[OK] copied $HOST_FRONTEND_PATH -> $(pwd)/frontend"
          fi

          # 복사 후 .env 확인 (프론트엔드 빌드에 사용됨)
          [ -f frontend/.env ] || { echo "[WARN] frontend/.env missing. Build may fail."; ls -al frontend || true; }
        '''
      }
    }

    stage('Prepare AI .env') {
      steps {
        sh '''
          set -e
          HOST_AI_ENV=/home/ubuntu/joying/ai/.env

          # 호스트에서 AI .env 파일 복사
          if [ -f "$HOST_AI_ENV" ]; then
            echo "[INFO] copying AI .env from host"
            mkdir -p ai
            cp "$HOST_AI_ENV" ./ai/.env
            echo "[OK] copied $HOST_AI_ENV -> $(pwd)/ai/.env"
          else
            echo "[ERR] $HOST_AI_ENV not found"
            exit 1
          fi

          # .env 확인 (민감 정보는 숨김)
          echo "[INFO] preview ai/.env (API key hidden)"
          grep -E '^(GMS|AI|HOST|PORT|ALLOWED)_' ai/.env | sed 's/=.*/=***hidden***/' || true
        '''
      }
    }

    stage('Build frontend') {
      agent {
        docker {
          image 'node:20-alpine'
          args '-u root:root'
        }
      }
      steps {
        sh '''
          set -e
          echo "[INFO] Starting frontend build inside node container..."
          cd frontend
          npm install
          npm run build
          echo "[OK] Frontend build completed. Output files are in: $(pwd)/dist (or build)"
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
          # frontend 빌드 결과물이 local workspace에 있으므로,
          # NGINX Dockerfile에서 이를 COPY할 수 있도록 다시 빌드합니다.
          # AI 서버도 함께 빌드
          docker compose --env-file .env.prod build backend nginx ai
        '''
      }
    }

    stage('Deploy (compose up)') {
      steps {
        sh '''
          set -e
          export COMPOSE_PROJECT_NAME=joying

          # 현재 실행 중 컨테이너가 사용하는 이미지 ID
          OLD_NGINX_IMG=$(docker inspect -f '{{.Image}}' joying-nginx 2>/dev/null || true)
          OLD_AI_IMG=$(docker inspect -f '{{.Image}}' joying-ai 2>/dev/null || true)

          # 로컬에 빌드된 최신 이미지 ID
          NEW_NGINX_IMG=$(docker images --no-trunc --quiet joying-nginx | head -n1 || true)
          NEW_AI_IMG=$(docker images --no-trunc --quiet joying-ai | head -n1 || true)

          echo "[INFO] nginx: old=${OLD_NGINX_IMG}, new=${NEW_NGINX_IMG}"
          echo "[INFO] ai: old=${OLD_AI_IMG}, new=${NEW_AI_IMG}"

          echo "[INFO] backend 재배포"
          docker compose --env-file .env.prod up -d --force-recreate --remove-orphans backend

          # AI 서버 배포 (이미지 변경 여부와 관계없이 항상 재배포)
          echo "[INFO] AI 서버 배포"
          docker compose --env-file .env.prod up -d --force-recreate ai

          # nginx 배포 (이미지 변경 시에만)
          if [ -n "$NEW_NGINX_IMG" ] && [ "$OLD_NGINX_IMG" != "$NEW_NGINX_IMG" ]; then
            echo "[INFO] nginx 이미지가 변경됨 → nginx만 무중단에 가깝게 교체"
            docker compose --env-file .env.prod up -d --no-deps --force-recreate nginx
          else
            echo "[INFO] nginx 이미지 변경 없음 → 컨테이너 유지"
            docker compose --env-file .env.prod up -d --no-deps --no-recreate nginx
          fi

          echo "[INFO] nginx 설정 문법 확인 후 reload"
          docker compose --env-file .env.prod exec -T nginx nginx -t
          docker compose --env-file .env.prod exec -T nginx nginx -s reload || docker compose --env-file .env.prod restart nginx

          echo "[INFO] AI 서버 헬스 체크"
          sleep 5
          docker compose --env-file .env.prod exec -T ai python -c "import requests; r=requests.get('http://localhost:8000/health'); print(r.json()); exit(0 if r.status_code==200 else 1)" || echo "[WARN] AI health check failed"

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
