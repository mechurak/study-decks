---
layout: section
---

# 0. 시작하기 전에

이 덱을 어떻게 읽을 것인가

---

## 이 덱이 하려는 것

<div class="text-2xl py-6 leading-relaxed">
"이 명령을 외운다"가 아니라<br>
<strong>"이 명령을 쳤을 때 클러스터 안에서 무슨 일이 벌어지는가"</strong>를 남긴다.
</div>

<v-clicks>

- CKA는 **실기 시험**이다. 객관식이 아니라 진짜 클러스터를 고친다
- 그래서 암기는 오래 못 간다 — **동작 모델**이 있어야 처음 보는 문제도 푼다
- 반대로 동작 모델만 있고 손이 느리면 **시간에 진다**. 둘 다 필요하다

</v-clicks>

<v-click>

<div class="pt-4">
그래서 이 덱은 <strong>개념 → 실제 동작 → 명령 → 함정</strong> 순서로 반복한다.
</div>

</v-click>

---

## 대상 독자

<v-clicks>

- `kubectl get pod`은 쳐봤고, Deployment가 뭔지는 안다
- 그런데 **"Pod이 Pending인데 왜 그런지"** 를 30초 안에 못 짚는다
- etcd 백업·복구, kubeadm 업그레이드처럼 **평소에 안 하는 작업**이 불안하다
- 실무는 EKS/GKE 같은 관리형이라 **컨트롤 플레인을 만져본 적이 없다**

</v-clicks>

<v-click>

<div class="pt-4 text-lg">
전부 해당된다면 정확히 이 덱의 대상이다.
특히 마지막 항목 — <strong>CKA 배점의 25%가 관리형에서 못 만지는 영역</strong>이다.
</div>

</v-click>

---
class: dense
---

## 덱의 구성 — 커리큘럼 도메인에 맞춰 정렬했다

| 장 | 주제 | CKA 도메인 |
|---|---|---|
| 1 | 시험 자체 | — |
| 2~3 | 아키텍처 · kubectl | 기초 |
| 4~8 | Pod · 워크로드 · 설정 · 스케줄링 · 오토스케일링 | Workloads & Scheduling (15%) |
| 9~12 | Service · DNS · Ingress/Gateway · NetworkPolicy | Services & Networking (20%) |
| 13 | 스토리지 | Storage (10%) |
| 14~17 | RBAC · 클러스터 라이프사이클 · Helm/Kustomize · 확장 | Cluster Architecture (25%) |
| 18 | 트러블슈팅 | Troubleshooting (30%) |
| 19~20 | 시험 전략 · 마무리 | — |

<v-click>

**배점 순서와 학습 순서는 다르다.** 트러블슈팅이 30%지만 마지막에 있는 이유는,
앞의 전부를 알아야 진단이 되기 때문이다.

</v-click>

---

## 이 덱 전체를 관통하는 한 문장

<div class="text-3xl py-10 leading-relaxed text-center">
Kubernetes의 모든 것은<br>
<strong>"선언된 상태"와 "실제 상태"의 차이를 줄이는 루프</strong>다.
</div>

<v-clicks>

- 당신은 `spec`(원하는 상태)을 쓴다
- 컨트롤러가 `status`(실제 상태)를 보고 차이를 좁힌다
- **문제가 생겼다 = 루프가 어딘가에서 막혔다**

</v-clicks>

<v-click>

<div class="pt-4">
트러블슈팅 30%가 결국 이 한 문장이다. <strong>"어느 루프가 어디서 멈췄나"</strong>를 찾는 것.
</div>

</v-click>

---

## 표기 약속

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**슬라이드 안 표시**

<div class="exam-tip">
<strong>시험</strong> — 이 형태로 출제된다, 또는 시간을 아끼는 방법
</div>

<div class="pitfall">
<strong>함정</strong> — 실제로 자주 틀리는 지점
</div>

</div>
<div>

**명령 표기**

- `k` = `kubectl` (시험 환경에 alias가 걸려 있다)
- `-n <ns>` 는 대부분 생략해서 적었다. **실제 시험에서는 거의 항상 필요하다**
- 노드에서 실행하는 명령은 `sudo` 를 붙여 표기

</div>
</div>

<v-click>

<div class="pt-4 text-sm opacity-80">
YAML은 시험에서 그대로 쓸 수 있게 <strong>축약 없이</strong> 적었다.
</div>

</v-click>

---

## 실습 환경은 따로 준비하자

이 덱은 **읽는 자료**다. 손은 클러스터에서 움직여야 한다.

<v-clicks>

| 용도 | 도구 | 비고 |
|---|---|---|
| 로컬 멀티노드 | **kind** (+ Docker/colima) | 가장 빠르게 뜬다. 컨트롤 플레인이 컨테이너 |
| 업그레이드·etcd 연습 | **killercoda** | 무료. 진짜 kubeadm 노드를 준다 |
| 0→1 클러스터 구축 | **VM 2대** (Multipass/UTM 등) | `kubeadm init` 을 한 번은 직접 해봐야 한다 |
| 시험 직전 모의고사 | **killer.sh** | 시험 등록 시 2세션 포함. 실제보다 어렵다 |

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — kind는 <code>kubeadm upgrade</code> 연습에 부적합하다.
노드가 컨테이너라 <code>apt install kubeadm</code> 흐름이 실제와 다르다. 업그레이드는 killercoda에서.
</div>

</v-click>

---

## 이 덱의 정보 기준 시점

<v-clicks>

- **CKA 커리큘럼 v1.35** (cncf/curriculum) 기준으로 도메인·비중을 정렬했다
- **시험 환경 Kubernetes v1.35** 기준으로 API 버전과 명령을 적었다
- 커리큘럼은 대략 분기마다, 시험 환경 버전은 **k8s 릴리스 후 4~8주 안에** 따라 올라간다

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 시험 접수 직전에 아래 두 곳을 반드시 다시 확인할 것.<br>
<code>github.com/cncf/curriculum</code> · Linux Foundation의 CKA program changes 페이지
</div>

</v-click>

<v-click>

<div class="pt-2">
버전이 올라가도 <strong>이 덱의 개념 부분은 거의 그대로</strong>다.
바뀌는 건 주로 API 버전 표기와 새로 GA된 기능 몇 개다.
</div>

</v-click>

---

## 0장 요약

<v-clicks>

- CKA는 **실기**다 — 개념 모델과 손 속도가 **둘 다** 필요하다
- 덱은 커리큘럼 5개 도메인 순서로 배치했고, 트러블슈팅(30%)이 마지막인 건 **앞의 전부가 재료**라서다
- 모든 장을 관통하는 축: **"선언된 상태 ↔ 실제 상태를 좁히는 루프"**
- 읽기만 하면 안 된다. **kind + killercoda**를 옆에 띄워두고 볼 것

</v-clicks>

<v-click>

<div class="pt-6 text-lg">
다음 장에서 <strong>시험 자체</strong>를 먼저 해부한다.
무엇이 나오는지 모르면 무엇을 공부할지도 못 정한다.
</div>

</v-click>
