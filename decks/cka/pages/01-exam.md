---
layout: section
---

# 1. CKA 시험 해부

무엇이 나오고, 어떻게 채점되는가

---

## CKA는 어떤 시험인가

<div class="grid grid-cols-2 gap-8 pt-2">
<div>

**형식**

- **2시간**, 원격 감독(웹캠 필수)
- **15~20개**의 수행형 과제
- 합격선 **66%**
- 문제는 **순서 무관** — 아무거나 먼저 풀어도 된다
- 재응시 1회 무료 포함

</div>
<div>

**환경**

- 브라우저 안의 **리눅스 데스크톱 + 터미널**
- 진짜 클러스터 여러 개를 준다
- 문제마다 **`kubectl config use-context ...`** 를 먼저 실행
- 노드 접속은 **`ssh <노드이름>`**, 권한은 **`sudo -i`**

</div>
</div>

<v-click>

<div class="pitfall">
<strong>함정</strong> — 클러스터가 여러 개다. 컨텍스트를 안 바꾸고 풀면
<strong>맞게 풀어도 0점</strong>이다. 문제 시작 시 주는 컨텍스트 명령을 무조건 먼저 붙여넣을 것.
</div>

</v-click>

---

## 도메인과 배점

| 비중 | 도메인 | 이 덱의 장 |
|---|---|---|
| **30%** | Troubleshooting | 18장 |
| **25%** | Cluster Architecture, Installation and Configuration | 14~17장 |
| **20%** | Servicing and Networking | 9~12장 |
| **15%** | Workloads and Scheduling | 4~8장 |
| **10%** | Storage | 13장 |

<v-clicks>

- **트러블슈팅 + 클러스터 아키텍처 = 55%.** 여기가 승부처다
- 그런데 많은 사람이 **Pod/Deployment(15% 쪽)에 시간을 제일 많이 쓴다.** 배분이 틀렸다
- 스토리지는 10%지만 **문제 유형이 좁아서 확실히 챙기면 거의 다 먹는다**

</v-clicks>

---
class: denser
---

## 도메인별 실제 출제 항목 (커리큘럼 원문 정리)

<div class="grid grid-cols-2 gap-5 text-sm">
<div>

**Cluster Architecture (25%)**
- RBAC 관리
- 클러스터 설치를 위한 인프라 준비
- **kubeadm으로 클러스터 생성·관리**
- **클러스터 라이프사이클(업그레이드) 관리**
- 고가용성 컨트롤 플레인 구성
- **Helm·Kustomize로 컴포넌트 설치**
- 확장 인터페이스(CNI, CSI, CRI) 이해
- **CRD 이해, 오퍼레이터 설치·구성**

**Storage (10%)**
- StorageClass와 동적 프로비저닝
- 볼륨 타입·접근 모드·reclaim 정책
- PV / PVC 관리

</div>
<div>

**Workloads and Scheduling (15%)**
- Deployment 롤링 업데이트·롤백
- ConfigMap·Secret으로 앱 설정
- **워크로드 오토스케일링 구성**
- 자가치유 배포의 기본 요소
- **Pod admission과 스케줄링(limits, node affinity 등)**

**Servicing and Networking (20%)**
- Pod 간 연결성 이해
- NetworkPolicy 정의·적용
- ClusterIP / NodePort / LoadBalancer와 엔드포인트
- **Gateway API로 Ingress 트래픽 관리**
- Ingress 컨트롤러와 Ingress 리소스
- CoreDNS 이해·사용

**Troubleshooting (30%)**
- 클러스터·노드 / 클러스터 컴포넌트 진단
- 리소스 사용량 모니터링
- **컨테이너 출력 스트림 관리·평가**
- 서비스·네트워킹 진단

</div>
</div>

---

## 커리큘럼에서 읽어야 할 신호

굵게 표시한 항목들이 **최근 개정에서 들어오거나 강조된 것**들이다.

<v-clicks>

- **Gateway API** — Ingress만 알면 안 된다. CRD 기반이라 설치부터 다르다 (11장)
- **Helm / Kustomize** — "컴포넌트 설치" 맥락. 차트 작성이 아니라 **설치·값 오버라이드** (16장)
- **CRD와 오퍼레이터** — 직접 만들진 않지만 **읽고 설치하고 상태를 확인**할 줄 알아야 (17장)
- **워크로드 오토스케일링** — HPA. metrics-server가 없으면 아무것도 안 된다 (8장)
- **컨테이너 출력 스트림** — 로그. `kubectl logs` 옵션 전부 + 노드의 로그 파일 위치 (18장)

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — 오래된 학습 자료는 Docker·PodSecurityPolicy 같은
<strong>이미 빠진 항목</strong>을 다룬다. 반대로 Gateway API가 없다. 자료의 개정일을 먼저 볼 것.
</div>

</v-click>

---

## 시험 환경에 이미 준비된 것들

<v-clicks>

| 항목 | 상태 |
|---|---|
| `k` alias | **`kubectl`로 설정되어 있다** |
| bash 자동완성 | 켜져 있다 |
| `yq` | 설치되어 있다 (YAML 편집에 유용) |
| `curl` / `wget` | 있다 — Service 연결 확인용 |
| `man` | 있다 |
| 편집기 | `vim`, `nano` 등 |

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — <code>k</code> alias는 이미 있지만
<strong><code>export do='--dry-run=client -o yaml'</code></strong> 같은 개인 단축은 직접 만들어야 한다.
시험 시작 5초를 여기에 쓰면 나중에 몇 분을 번다. (19장에 전체 세트)
</div>

</v-click>

---

## 터미널에서 알아둘 조작

<v-clicks>

- **복사/붙여넣기는 `Ctrl+Shift+C` / `Ctrl+Shift+V`** — 터미널 안에서는 `Ctrl+C`가 안 된다
- **`Insert` 키가 막혀 있다** — vim에서 삽입 모드는 `i`, 빠져나오기는 `Esc`
- 문제 지문에서 명령을 복사할 때 **줄바꿈이 깨지는 일**이 있다. 붙여넣고 눈으로 확인
- 노드 작업 후에는 **반드시 `exit`** 해서 원래 셸로 돌아올 것 (다음 문제를 노드에서 풀면 안 된다)

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <code>ssh node01</code> 후 <code>exit</code>을 잊고 다음 문제를 풀면
<code>kubectl</code>이 다른 kubeconfig를 보거나 아예 없다. "갑자기 명령이 안 먹는다" 의 90%가 이것이다.
</div>

</v-click>

---

## vim 최소 세트

YAML을 손으로 고쳐야 하는 순간은 반드시 온다.

```vim
" ~/.vimrc — 시험 시작하자마자 만들어도 좋다
set expandtab
set tabstop=2
set shiftwidth=2
set number
```

<div class="grid grid-cols-2 gap-6 pt-2 text-sm">
<div>

**이동**
- `gg` / `G` — 처음 / 끝
- `:42` — 42번 줄로
- `/문자열` + `n` — 검색

</div>
<div>

**편집**
- `dd` / `3dd` — 줄 삭제
- `yy` + `p` — 줄 복사·붙여넣기
- `u` / `Ctrl+r` — 실행 취소 / 되돌리기
- `V` + `>` — 블록 들여쓰기

</div>
</div>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — <code>set expandtab</code>이 없으면 탭 문자가 들어가
<strong>YAML 파싱 에러</strong>가 난다. 이것 하나로 문제를 통째로 날린 사례가 흔하다.
</div>

</v-click>

---

## 열어놓을 수 있는 문서

시험 중 브라우저에서 **아래만** 열 수 있다.

<v-clicks>

- `kubernetes.io/docs/` — 공식 문서 (검색 기능도 사용 가능)
- `kubernetes.io/blog/`
- `helm.sh/docs/`
- `gateway-api.sigs.k8s.io/`
- 문제의 Quick Reference 박스가 주는 링크

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong>공식 문서 검색 결과 중 외부 사이트는 열면 안 된다.</strong>
GitHub, StackOverflow, 블로그 전부 금지다. 검색은 되지만 클릭에 주의.
</div>

</v-click>

<v-click>

<div class="pt-2">
그래서 <strong>"공식 문서 어디에 뭐가 있는지"</strong> 자체가 실력이다.
평소 연습할 때부터 다른 사이트를 끊고 kubernetes.io만 보자.
</div>

</v-click>

---
class: denser
---

## 공식 문서에서 자주 퍼오는 페이지

외우는 게 아니라 **검색어를 외운다.**

| 필요한 것 | 검색어 | 얻는 것 |
|---|---|---|
| PV/PVC YAML | `persistent volume` | 완성된 매니페스트 |
| NetworkPolicy | `network policies` | 예제 5종 (deny-all 포함) |
| Ingress | `ingress` | 규칙·TLS 예제 |
| Gateway API | (Gateway API 사이트) `http routing` | Gateway + HTTPRoute 짝 |
| RBAC | `rbac` | Role/RoleBinding 예제 |
| etcd 백업 | `operating etcd` | `etcdctl snapshot` 전체 명령 |
| 업그레이드 | `upgrade kubeadm clusters` | 단계별 명령 |
| Pod 스케줄링 | `assign pods nodes` | affinity 문법 |

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 문서 페이지의 YAML은 <strong>복사해서 이름만 바꾸는 게</strong> 가장 빠르다.
특히 <code>nodeAffinity</code>와 <code>NetworkPolicy</code>는 손으로 치면 거의 틀린다.
</div>

</v-click>

---

## 채점은 결과만 본다

<v-clicks>

- 채점은 **자동화된 검증 스크립트**가 클러스터의 최종 상태를 본다
- **어떻게 만들었는지는 상관없다** — `kubectl create`든 YAML 파일이든 동일
- 그러니 **YAML 파일을 예쁘게 만들 이유가 없다.** 상태만 맞으면 된다
- 부분 점수가 있다 — 문제 안에 여러 요구가 있으면 맞춘 만큼 받는다

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 그래서 전략은 명확하다.
<strong>명령형(imperative) 명령으로 만들 수 있는 건 전부 명령형으로</strong> 만들고,
안 되는 것만 <code>--dry-run=client -o yaml</code>로 뽑아 고친다. (3장·19장)
</div>

</v-click>

---

## 시간 배분이 진짜 시험이다

2시간 / 17문제 ≈ **문제당 7분**. 그런데 난이도가 균일하지 않다.

<v-clicks>

- **1분 문제**: 라벨 붙이기, Pod 하나 만들기, 노드 cordon
- **10~15분 문제**: 클러스터 업그레이드, etcd 복구, 고장난 컨트롤 플레인 수리

</v-clicks>

<v-click>

**권장 흐름**

1. 전체를 **한 번 훑으며** 쉬운 것부터 처리 (배점이 문제마다 표시된다)
2. 막히면 **플래그 걸고 즉시 넘어간다.** 5분 룰
3. 남은 시간에 플래그로 돌아온다
4. **마지막 10분은 검산** — 컨텍스트 실수, 네임스페이스 실수 확인

</v-click>

<v-click>

<div class="pitfall">
<strong>함정</strong> — 배점이 높다고 먼저 풀지 말 것.
<strong>배점 4%짜리 1분 문제 5개 = 20%</strong>가 15%짜리 하나보다 크다.
</div>

</v-click>

---

## 준비 로드맵

<v-clicks>

| 시기 | 할 일 |
|---|---|
| **1~2주차** | 아키텍처·kubectl·Pod·워크로드 (2~6장). kind로 손에 익히기 |
| **3~4주차** | 스케줄링·Service·DNS·Ingress·NetworkPolicy (7~12장) |
| **5주차** | 스토리지·RBAC (13~14장). 여기는 문제 유형이 좁으니 확실히 |
| **6~7주차** | **클러스터 라이프사이클 (15장)** — killercoda에서 업그레이드·etcd 10회 이상 반복 |
| **8주차** | 트러블슈팅(18장) 집중 + killer.sh 1세션 |
| **시험 직전** | killer.sh 2세션, 틀린 것만 복습, 치트시트 손에 붙이기 (19장) |

</v-clicks>

<v-click>

<div class="pt-2">
<strong>15장(라이프사이클)에 가장 많은 시간을 써야 한다.</strong>
평소에 안 하는 작업이라 반복 말고는 방법이 없다.
</div>

</v-click>

---

## 1장 요약

<v-clicks>

- 2시간 / 15~20문제 / **66% 합격** / 순서 무관 / 클러스터 여러 개
- **컨텍스트 전환을 안 하면 맞아도 0점** — 가장 비싼 실수
- 배점의 **55%가 트러블슈팅 + 클러스터 아키텍처**. 시간 배분을 여기에 맞춰라
- 열 수 있는 문서는 **kubernetes.io / helm.sh / gateway-api.sigs.k8s.io** 뿐
- 채점은 **최종 상태만** 본다 → 명령형 우선, YAML은 필요할 때만
- 노드에서 나올 때 **`exit`**, vim은 **`expandtab`**

</v-clicks>

<v-click>

<div class="pt-4 text-lg">
다음 장부터 본론이다. <strong>클러스터가 실제로 어떻게 생겼는지</strong>부터.
</div>

</v-click>
