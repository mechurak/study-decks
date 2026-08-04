---
layout: section
---

# 16. Helm과 Kustomize

클러스터 컴포넌트를 설치하는 두 방법

---

## 왜 커리큘럼에 있나

<v-clicks>

커리큘럼 항목은 **"Use Helm and Kustomize to install cluster components"** 다.

- 차트를 **만드는** 게 아니라 **설치하고 값을 바꾸는** 쪽이다
- 실제로 CNI·Ingress 컨트롤러·모니터링은 전부 이 둘 중 하나로 설치한다

</v-clicks>

<v-click>

<div class="pt-2">

| | Helm | Kustomize |
|---|---|---|
| 방식 | **템플릿 + 값 주입** | **베이스 YAML + 오버레이 패치** |
| 배포 형태 | 패키지(차트) 저장소 | 그냥 디렉터리 |
| 상태 관리 | **릴리스**를 추적한다 | 없음 (kubectl apply와 동일) |
| 설치 | 별도 바이너리 | **kubectl에 내장** (`-k`) |

</div>

</v-click>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — <code>helm.sh/docs</code>는 <strong>열 수 있는 사이트</strong>다.
명령을 다 외울 필요는 없고 <strong>어디를 찾을지</strong>만 알면 된다.
</div>

</v-click>

---
class: dense
---

## Helm의 구성 요소

<v-clicks>

| 용어 | 뜻 |
|---|---|
| **Chart** | 패키지. 템플릿 + 기본값의 묶음 |
| **Values** | 차트에 주입하는 설정값 |
| **Release** | 클러스터에 설치된 차트의 **인스턴스**. 이름이 있다 |
| **Repository** | 차트를 배포하는 곳 |

</v-clicks>

<v-click>

```
mychart/
  Chart.yaml          # 이름, 버전, 의존성
  values.yaml         # 기본값
  templates/          # Go 템플릿이 섞인 매니페스트
    deployment.yaml
    service.yaml
    _helpers.tpl
  charts/             # 서브차트
```

</v-click>

<v-click>

<div class="pt-2">
같은 차트를 <strong>다른 이름의 릴리스로 여러 번</strong> 설치할 수 있다.
릴리스 정보는 <strong>네임스페이스의 Secret</strong>에 저장된다 (Helm 3부터. Tiller는 없어졌다).
</div>

</v-click>

---

## Helm 기본 명령

```bash
# 저장소
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm repo list
helm search repo ingress
helm search hub prometheus

# 차트 살펴보기
helm show values ingress-nginx/ingress-nginx        # 설정 가능한 값 전부
helm show chart ingress-nginx/ingress-nginx
helm pull ingress-nginx/ingress-nginx --untar       # 로컬로 받아서 뜯어보기

# 설치
helm install my-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# 확인
helm list -A
helm status my-ingress -n ingress-nginx
helm get values my-ingress -n ingress-nginx
helm get manifest my-ingress -n ingress-nginx       # 실제로 적용된 YAML
```

---

## 값 오버라이드 — 실무의 핵심

```bash
# 1) --set 으로 개별 값
helm install my-ingress ingress-nginx/ingress-nginx \
  --set controller.replicaCount=3 \
  --set controller.service.type=NodePort \
  --set-string controller.config.use-forwarded-headers="true"

# 2) values 파일로 (권장)
helm install my-ingress ingress-nginx/ingress-nginx -f my-values.yaml

# 3) 여러 파일 — 뒤가 앞을 덮는다
helm install my-ingress ingress-nginx/ingress-nginx -f base.yaml -f prod.yaml
```

<v-clicks>

```bash
# 적용 전에 결과 확인 — 시험·실무 모두 유용하다
helm template my-ingress ingress-nginx/ingress-nginx -f my-values.yaml
helm install my-ingress ingress-nginx/ingress-nginx --dry-run --debug
```

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — "이 차트의 어떤 값을 바꾸시오"류는
<strong><code>helm show values</code>로 키 이름을 찾고 <code>--set</code></strong> 으로 끝낸다.
</div>

</v-click>

---

## 업그레이드와 롤백

```bash
helm upgrade my-ingress ingress-nginx/ingress-nginx --set controller.replicaCount=5
helm upgrade --install my-ingress ingress-nginx/ingress-nginx     # 없으면 설치, 있으면 업그레이드

helm history my-ingress -n ingress-nginx
# REVISION  UPDATED       STATUS      CHART                 DESCRIPTION
# 1         2026-08-01    superseded  ingress-nginx-4.11.0  Install complete
# 2         2026-08-05    deployed    ingress-nginx-4.11.0  Upgrade complete

helm rollback my-ingress 1 -n ingress-nginx
helm uninstall my-ingress -n ingress-nginx
```

<v-clicks>

<div class="pitfall">
<strong>함정 1</strong> — <code>helm upgrade</code>에서 <code>-f</code>나 <code>--set</code>을 안 주면
<strong>이전 값이 유지된다</strong>(Helm 3 기준). 하지만 <code>--reset-values</code>를 쓰면 초기화된다.
헷갈리면 <code>helm get values</code>로 현재 값을 먼저 확인하자.
</div>

<div class="pitfall">
<strong>함정 2</strong> — <strong><code>helm uninstall</code>은 CRD를 지우지 않는다.</strong>
차트가 만든 CRD는 남는다. 의도된 동작이다(데이터 보호).
</div>

</v-clicks>

---

## Kustomize — 템플릿 없는 커스터마이징

```
base/
  kustomization.yaml
  deployment.yaml
  service.yaml
overlays/
  dev/
    kustomization.yaml
    replica-patch.yaml
  prod/
    kustomization.yaml
    replica-patch.yaml
```

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
commonLabels:
  app: web
```

<v-clicks>

- **템플릿 언어가 없다.** 전부 유효한 YAML이다
- 베이스는 그대로 두고 **오버레이가 패치를 얹는다**
- `kubectl`에 내장되어 있다 — 별도 설치가 필요 없다

</v-clicks>

---
class: dense
---

## 오버레이 — 이름·네임스페이스·이미지 바꾸기

```yaml
# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base                            # 베이스를 가져온다

namespace: prod                           # 전부 이 네임스페이스로
namePrefix: prod-                         # 모든 이름 앞에 붙인다
commonAnnotations: { owner: platform-team }

images:
  - { name: nginx, newTag: "1.28" }       # 이미지 태그만 교체
replicas:
  - { name: web, count: 5 }               # 레플리카 수만 교체
```

<v-clicks>

- `images` / `replicas` 는 **패치 파일 없이** 가장 자주 바꾸는 값을 직접 지정하는 단축이다
- `namePrefix`를 쓰면 **참조하는 Service·볼륨 이름도 함께** 갱신된다

</v-clicks>

---
class: dense
---

## 오버레이 — generator와 patch

```yaml
configMapGenerator:
  - name: app-config
    literals: ["LOG_LEVEL=warn"]
secretGenerator:
  - name: db-secret
    literals: ["password=prodsecret"]

patches:
  - path: resource-patch.yaml             # 파일로 패치
    target: { kind: Deployment, name: web }
```

<v-clicks>

- **generator**는 ConfigMap/Secret을 **오버레이에서 새로 만든다** (베이스에 둘 필요가 없다)
- **`patches`** 는 베이스의 임의 필드를 고친다. `target`으로 대상을 고른다
- 두 방식(전략적 병합 / JSON 6902)은 다음 슬라이드에서

</v-clicks>

---
class: denser
---

## Kustomize 실행

```bash
kubectl kustomize overlays/prod              # 결과를 출력만 (미리보기)
kubectl apply -k overlays/prod               # 적용 (delete -k 로 제거)
kustomize build overlays/prod | kubectl apply -f -   # 독립 바이너리를 쓸 때
```

<v-clicks>

**패치 두 가지 방식**

```yaml
# 1) 전략적 병합 패치 — 바꿀 부분만 같은 구조로 쓴다 (resource-patch.yaml)
apiVersion: apps/v1
kind: Deployment
metadata: { name: web }
spec:
  template:
    spec:
      containers:
        - name: nginx
          resources: { limits: { memory: 512Mi } }
```

```yaml
# 2) JSON 6902 패치 — 경로를 직접 지정 (kustomization.yaml 안에 인라인)
patches:
  - target: { kind: Deployment, name: web }
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5
```

</v-clicks>

---

## generator의 해시 접미사

```bash
kubectl kustomize overlays/prod | grep -A2 'kind: ConfigMap'
# name: prod-app-config-7g5bd8f2mk
```

<v-clicks>

- `configMapGenerator`/`secretGenerator`가 만든 이름에는 **내용 해시**가 붙는다
- 그리고 **참조하는 Deployment의 이름도 자동으로 갱신**된다
- 결과: **ConfigMap이 바뀌면 Deployment가 자동으로 롤아웃된다**

</v-clicks>

<v-click>

<div class="pt-2">
6장에서 본 <strong>"ConfigMap을 바꿔도 Pod이 안 바뀐다"</strong> 문제를
Kustomize가 구조적으로 해결하는 방식이다.
</div>

</v-click>

<v-click>

```yaml
generatorOptions:
  disableNameSuffixHash: true      # 해시를 끄고 싶다면
```

</v-click>

---

## 언제 무엇을 쓰나

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**Helm이 맞는 경우**

- **남이 만든 것을 설치**할 때
  (Ingress 컨트롤러, Prometheus, CNI)
- 설정 표면이 넓고 복잡할 때
- 버전 관리·롤백이 필요할 때

</div>
<div>

**Kustomize가 맞는 경우**

- **내가 만든 앱**을 환경별로 변형할 때
- YAML을 그대로 읽고 싶을 때
- 템플릿 문법을 도입하고 싶지 않을 때

</div>
</div>

<v-clicks>

<div class="pt-3">
둘은 <strong>배타적이지 않다.</strong> Helm으로 렌더한 결과를 Kustomize로 패치하는 조합도 흔하다.
</div>

```bash
helm template prom prometheus/kube-prometheus-stack > base/all.yaml
# → 이후 Kustomize 오버레이로 환경별 변형
```

</v-clicks>

---

## 16장 요약

<v-clicks>

- 커리큘럼의 초점은 **"설치하고 값을 바꾸기"** — 차트 작성이 아니다
- Helm: **Chart(패키지) + Values(설정) + Release(인스턴스)**
- **`helm show values`로 키를 찾고 `--set` 또는 `-f`로 덮어쓴다**
- 적용 전 확인은 **`helm template`** 또는 **`--dry-run --debug`**
- **`helm uninstall`은 CRD를 남긴다**
- Kustomize: **템플릿 없음.** 베이스 + 오버레이 패치. **`kubectl -k`에 내장**
- **generator의 해시 접미사가 ConfigMap 변경 시 자동 롤아웃**을 만든다
- **남의 것은 Helm, 내 것은 Kustomize** — 실무의 대략적 경계

</v-clicks>
