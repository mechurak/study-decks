---
layout: section
---

# 20. 마무리

지금까지 본 것을 하나로

---

## 전체 지도

```mermaid {scale: 0.56}
flowchart TB
    A["선언된 상태 (spec)"] --> B["API 서버<br/>인증 → 인가 → admission → etcd"]
    B --> C["컨트롤러들<br/>Deployment · ReplicaSet · Job …"]
    C --> D["스케줄러<br/>nodeName 결정"]
    D --> E["kubelet<br/>컨테이너 실행 · probe"]
    E --> F["실제 상태 (status)"]
    F -.->|"차이를 좁힌다"| C

    G["Service · DNS · Ingress"] --> E
    H["PV/PVC · CSI"] --> E
    I["RBAC · NetworkPolicy"] --> B

    style B fill:#dbeafe,stroke:#326ce5
    style F fill:#dcfce7,stroke:#16a34a
```

<v-click>

**0장에서 말한 한 문장으로 돌아온다** — 모든 것은 **spec과 status의 차이를 줄이는 루프**다.

</v-click>

---
class: denser
---

## 장별로 남길 한 줄

<v-clicks>

| 장 | 한 줄 |
|---|---|
| 2 아키텍처 | 모든 화살표는 **API 서버**를 향한다. 컨트롤 플레인은 **스태틱 Pod** |
| 3 kubectl | **명령형으로 만들고 `$do`로 뽑아 고친다** |
| 4 Pod | **liveness는 죽이고 readiness는 트래픽만 끊는다** |
| 5 워크로드 | Deployment → ReplicaSet → Pod. **옛 RS가 롤백의 재료** |
| 6 설정 | **requests는 스케줄링, limits는 런타임 강제** |
| 7 스케줄링 | **affinity는 Pod이 고르고, taint는 노드가 밀어낸다** |
| 8 오토스케일링 | **metrics-server + requests**가 없으면 HPA는 아무것도 못 한다 |
| 9 Service | 진단의 1번은 **`get endpoints`** |
| 10 DNS | **`nslookup kubernetes.default`** 가 기준점 |
| 11 Ingress/Gateway | 규칙은 리소스, 일은 **컨트롤러**가 한다 |
| 12 NetworkPolicy | **정책이 붙는 순간 기본 거부.** egress면 **DNS를 열어라** |
| 13 스토리지 | **RWO는 노드 하나.** `Multi-Attach`는 여기서 온다 |
| 14 RBAC | **401은 인증, 403은 인가.** 검산은 `auth can-i --as` |
| 15 라이프사이클 | **첫 노드는 `apply`, 나머지는 `node`** |
| 16 Helm/Kustomize | 남의 것은 **Helm**, 내 것은 **Kustomize** |
| 17 확장 | **CRD를 만들어도 행동하는 주체는 없다** |
| 18 트러블슈팅 | **고치기 전에 층을 확정하라** |

</v-clicks>

---

## 반복해야 하는 것 — 딱 다섯 가지

<v-clicks>

이해로 끝나지 않고 **손이 기억해야** 하는 것들이다.

1. **클러스터 업그레이드** — 저장소 URL → `apply`/`node` → kubelet → `uncordon`
2. **etcd 백업·복구** — 인증서 3종, 새 data-dir, `etcd.yaml` 수정
3. **고장난 컨트롤 플레인 복구** — `crictl` → 로그 → 매니페스트 수정
4. **RBAC 만들고 검산** — Role → Binding → `auth can-i --as`
5. **네트워크 진단 5단계** — localhost → Pod IP → ClusterIP → DNS → 외부

</v-clicks>

<v-click>

<div class="pt-3">
<strong>1~3번은 killercoda에서, 4~5번은 kind에서</strong> 연습할 수 있다.
각각 <strong>5회 이상</strong> 반복하면 시험장에서 생각하지 않고 손이 움직인다.
</div>

</v-click>

---

## 자주 되돌아올 슬라이드

<v-clicks>

시험 직전에는 이 슬라이드들만 훑어도 충분하다.

- **각 장의 마지막 "요약" 슬라이드** (20장 전체)
- **19장 치트시트 5장** — 생성 / 조회 / 진단 / 운영 / etcd
- **18장의 상태별 진단 표** — STATUS를 보면 다음 명령이 정해진다
- **15장의 업그레이드 순서 요약**
- **14장의 Role/Binding 조합 표**
- **7장의 스케줄링 실패 메시지 표**
- **9장의 "어디서 끊겼는지 판별하기" 표**

</v-clicks>

<v-click>

<div class="pt-2 text-sm opacity-80">
인덱스 페이지의 목차에서 장을 펼치면 각 슬라이드로 바로 갈 수 있다.
</div>

</v-click>

---

## 시험 이후 — 실무로 가는 길

<v-clicks>

CKA는 **관리자 관점**의 기초다. 그 다음은 관심사에 따라 갈린다.

| 방향 | 다음 |
|---|---|
| **보안** | CKS — PSA, admission webhook, 런타임 보안, 이미지 스캔 |
| **개발** | CKAD — 워크로드 설계 관점 (범위가 겹치니 비교적 쉽다) |
| **플랫폼** | GitOps(ArgoCD), Helm 차트 작성, 오퍼레이터 개발 |
| **관측성** | Prometheus, Grafana, OpenTelemetry, 로그 파이프라인 |
| **클라우드** | EKS/GKE 운영 — IRSA, 노드그룹, Karpenter, VPC CNI |

</v-clicks>

<v-click>

<div class="pt-2">
<strong>다만 순서를 잘못 잡지 말 것.</strong> 이 덱의 15·18장이 흔들리면
어떤 방향으로 가도 결국 같은 자리로 돌아오게 된다.
</div>

</v-click>

---

## 마지막으로

<div class="text-2xl py-8 leading-relaxed">
CKA는 <strong>암기 시험이 아니라 손 시험</strong>이다.<br>
이 덱을 세 번 읽는 것보다<br>
<strong>업그레이드를 세 번 직접 하는 것</strong>이 낫다.
</div>

<v-clicks>

- 개념이 흔들리면 이 덱으로 돌아온다
- 손이 안 움직이면 **클러스터를 띄운다**
- 막히면 **`describe`의 Events를 읽는다** — 대부분 답이 거기 있다

</v-clicks>

<v-click>

<div class="pt-6 text-lg opacity-80">
합격을 빈다. 🎉
</div>

</v-click>
