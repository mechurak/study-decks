---
layout: section
---

# 19. 시험 전략과 치트시트

아는 것을 2시간 안에 꺼내기

---

## 시험 시작 30초 루틴

```bash
# 1) 별칭과 단축 변수
alias k=kubectl                       # 보통 이미 있다
export do='--dry-run=client -o yaml'
export now='--force --grace-period=0'
source <(kubectl completion bash)
complete -F __start_kubectl k

# 2) vim 설정 — 탭 문자로 YAML을 깨뜨리지 않기 위해
cat <<'EOF' > ~/.vimrc
set expandtab
set tabstop=2
set shiftwidth=2
set number
EOF
```

<v-clicks>

<div class="pt-1">
이 30초가 <strong>남은 2시간의 속도를 정한다.</strong>
특히 <code>$do</code>는 거의 모든 문제에서 쓰게 된다.
</div>

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <code>~/.vimrc</code>는 <strong>지금 열려 있는 vim에는 적용되지 않는다.</strong>
시험 시작 직후, 아무것도 열기 전에 만들 것.
</div>

</v-click>

---

## 문제마다 반복하는 3단계

<div class="text-lg py-3">

**① 컨텍스트 전환** — 지문의 명령을 그대로 복사해서 실행

```bash
kubectl config use-context k8s-c1-A
```

**② 네임스페이스 확인** — 지문이 지정했으면 반드시 `-n`

```bash
kubectl config set-context --current --namespace=<지정된ns>
```

**③ 풀고 나면 검산** — 만든 것을 눈으로 확인

```bash
kubectl get <리소스> -n <ns>
```

</div>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong>①을 빠뜨리면 정답을 만들어도 0점</strong>이다.
가장 흔하고 가장 비싼 실수. 지문의 첫 줄을 무조건 먼저 실행하는 습관을 들일 것.
</div>

</v-click>

---

## 생성 치트시트 — 워크로드

```bash
# Pod
k run nginx --image=nginx
k run nginx --image=nginx --port=80 --labels=app=web
k run nginx --image=nginx $do > pod.yaml
k run busy --image=busybox --restart=Never -- sleep 3600
k run tmp --image=busybox --rm -it --restart=Never -- sh          # 일회용 셸

# Deployment
k create deploy web --image=nginx --replicas=3
k create deploy web --image=nginx --replicas=3 $do > deploy.yaml
k scale deploy web --replicas=5
k set image deploy/web nginx=nginx:1.28
k rollout status deploy/web
k rollout undo deploy/web
k rollout restart deploy/web

# Job / CronJob
k create job hello --image=busybox -- echo hi
k create job manual --from=cronjob/nightly
k create cronjob nightly --image=busybox --schedule="0 3 * * *" -- echo backup
```

---

## 생성 치트시트 — 네트워크 · 설정

```bash
# Service
k expose deploy web --port=80 --target-port=8080 --name=web-svc
k expose deploy web --port=80 --type=NodePort
k create svc clusterip web-svc --tcp=80:8080
k create svc nodeport web-svc --tcp=80:8080 --node-port=30080

# Ingress
k create ingress web --class=nginx --rule="example.com/*=web-svc:80"
k create ingress web --class=nginx \
  --rule="example.com/api*=api-svc:8080" \
  --rule="example.com/*=web-svc:80"

# ConfigMap / Secret
k create cm app-config --from-literal=KEY=val --from-file=./conf/
k create cm app-env --from-env-file=./app.env
k create secret generic db --from-literal=password=s3cr3t
k create secret tls web-tls --cert=./tls.crt --key=./tls.key
k create secret docker-registry regcred --docker-server=r.io --docker-username=u --docker-password=p

# 네임스페이스 / 쿼터
k create ns dev
k create quota dev-quota --hard=cpu=4,memory=8Gi,pods=20 -n dev
```

---

## 생성 치트시트 — RBAC

```bash
# ServiceAccount
k create sa deploy-bot

# Role / ClusterRole
k create role pod-reader --verb=get,list,watch --resource=pods -n dev
k create role pod-editor --verb=get,list,create,delete --resource=pods,deployments -n dev
k create clusterrole node-reader --verb=get,list,watch --resource=nodes

# Binding
k create rolebinding dev-rb --role=pod-reader --user=dev -n dev
k create rolebinding sa-rb --role=pod-reader --serviceaccount=dev:deploy-bot -n dev
k create clusterrolebinding ops-crb --clusterrole=cluster-admin --user=ops
k create rolebinding dev-edit --clusterrole=edit --user=bob -n dev     # ClusterRole + RoleBinding

# 검산  ★ 반드시 한다
k auth can-i list pods -n dev --as=dev
k auth can-i create deploy -n dev --as=system:serviceaccount:dev:deploy-bot
k auth can-i --list -n dev
```

---

## 조회 치트시트

```bash
# 기본
k get pods -o wide
k get pods -A
k get all -n dev
k get pods --show-labels
k get pods -l env=prod --no-headers | wc -l           # 개수 세기

# 정렬
k get pods --sort-by=.metadata.creationTimestamp
k get events -A --sort-by=.lastTimestamp | tail -30
k get nodes --sort-by=.metadata.name

# 필드 추출 — "파일에 저장하시오" 문제용
k get pods -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeName' --no-headers
k get pods -o jsonpath='{.items[*].spec.containers[*].image}'
k get pv --sort-by=.spec.capacity.storage -o custom-columns='NAME:.metadata.name,SIZE:.spec.capacity.storage'
k get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'

# 필터
k get pods --field-selector status.phase=Running
k get pods --field-selector spec.nodeName=node01
k get events --field-selector type=Warning
```

---

## 진단 치트시트

```bash
# 순서: describe → logs → yaml
k describe pod web | grep -A20 Events
k logs web --previous
k logs -l app=web --all-containers --prefix --tail=50
k get pod web -o yaml

# 노드
k describe node node01 | grep -A15 Conditions
k describe node node01 | grep -A10 'Allocated resources'
k top nodes ; k top pods -A --sort-by=memory

# 노드 안에서
sudo systemctl status kubelet
sudo journalctl -u kubelet -n 100 --no-pager
sudo crictl ps -a
sudo crictl logs <id>

# 네트워크
k get endpoints web-svc
k run tmp --image=busybox:1.36 --rm -it --restart=Never -- nslookup web-svc
k run tmp --image=busybox:1.36 --rm -it --restart=Never -- wget -qO- http://web-svc
```

---

## 클러스터 운영 치트시트

```bash
# 노드 관리
k drain node01 --ignore-daemonsets --delete-emptydir-data
k uncordon node01
k taint node node01 key=value:NoSchedule
k taint node node01 key=value:NoSchedule-
k label node node01 disktype=ssd

# 업그레이드 (노드에서)
sudo sed -i 's/v1.34/v1.35/' /etc/apt/sources.list.d/kubernetes.list && sudo apt-get update
sudo apt-mark unhold kubeadm && sudo apt-get install -y kubeadm=1.35.1-1.1 && sudo apt-mark hold kubeadm
sudo kubeadm upgrade plan
sudo kubeadm upgrade apply v1.35.1        # 첫 컨트롤 플레인
sudo kubeadm upgrade node                 # 나머지 전부
sudo apt-mark unhold kubelet kubectl && sudo apt-get install -y kubelet=1.35.1-1.1 kubectl=1.35.1-1.1 && sudo apt-mark hold kubelet kubectl
sudo systemctl daemon-reload && sudo systemctl restart kubelet

# 조인 / 인증서
kubeadm token create --print-join-command
sudo kubeadm certs check-expiration
sudo kubeadm certs renew all
```

---

## etcd 백업·복구 — 통째로 외울 것

```bash
# 경로 확인 (추측하지 말 것)
sudo grep -E 'cert-file|key-file|trusted-ca-file|data-dir|listen-client-urls' \
  /etc/kubernetes/manifests/etcd.yaml

# 백업
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /opt/backup.db

# 확인
sudo ETCDCTL_API=3 etcdctl --write-out=table snapshot status /opt/backup.db

# 복구
sudo ETCDCTL_API=3 etcdctl snapshot restore /opt/backup.db --data-dir=/var/lib/etcd-restore
sudo vim /etc/kubernetes/manifests/etcd.yaml    # volumes.hostPath.path 를 새 디렉터리로
# → kubelet이 자동으로 etcd Pod을 다시 만든다. 1~2분 대기
```

---

## YAML을 빠르게 만들고 고치는 법

```bash
# 1) 명령형으로 뼈대를 뽑는다
k run web --image=nginx $do > web.yaml
k create deploy web --image=nginx $do > deploy.yaml

# 2) 기존 리소스를 복사해서 고친다
k get pod web -o yaml > new.yaml
# → metadata의 uid, resourceVersion, creationTimestamp, status 를 지운다

# 3) 필드 이름이 기억 안 나면
k explain pod.spec.containers.resources
k explain deployment.spec.strategy --recursive | head -30

# 4) 적용 전에 검증
k apply -f web.yaml --dry-run=server
k diff -f web.yaml
```

<v-click>

<div class="exam-tip">
<strong>시험</strong> — <strong>빈 파일에 처음부터 YAML을 치지 말 것.</strong>
① 명령형 생성기 → ② 공식 문서 복사 → ③ 기존 리소스 복사.
이 세 경로 중 하나로 시작하는 게 항상 빠르다.
</div>

</v-click>

---
class: denser
---

## 자주 나오는 문제 유형

<v-clicks>

| 유형 | 핵심 |
|---|---|
| 클러스터 업그레이드 | 저장소 URL → `apply`/`node` → kubelet |
| etcd 백업·복구 | 인증서 3종, 새 data-dir |
| 고장난 컨트롤 플레인 | `/etc/kubernetes/manifests/` 의 값 하나 |
| 노드 NotReady | `journalctl -u kubelet` |
| RBAC 생성 | Role + Binding + `auth can-i` 검산 |
| CSR 승인 | `certificate approve` |
| PV/PVC 연결 | storageClassName·accessModes·용량 |
| NetworkPolicy | 문서 복사, AND/OR 주의 |
| Ingress / Gateway API | 문서 복사 |
| 스케줄링(taint·affinity) | 문서 복사 |
| 사이드카·initContainer 추가 | `kubectl edit` 또는 재생성 |
| DNS 확인 | `nslookup`, CoreDNS ConfigMap |
| 특정 조건의 Pod 찾아 파일에 저장 | `-l`, `--sort-by`, `custom-columns` |
| HPA 구성 | metrics-server + requests |
| 노드 drain / 스케줄 제어 | `--ignore-daemonsets` |

</v-clicks>

---

## 시간 관리

<v-clicks>

- **문제당 평균 7분.** 하지만 균일하지 않다
- **1차 순회** — 전체를 빠르게 훑으며 **3분 안에 풀리는 것**을 전부 처리
- **막히면 5분 룰** — 5분 안에 실마리가 안 보이면 **플래그 걸고 넘어간다**
- **2차 순회** — 남은 문제를 배점 순으로
- **마지막 10분은 검산**

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong>배점이 높다고 먼저 풀지 말 것.</strong>
4%짜리 1분 문제 5개(20%)가 15%짜리 하나보다 크다.
"빨리 풀리는 것부터"가 항상 옳다.
</div>

</v-click>

<v-click>

<div class="pt-1">
그리고 <strong>완벽주의를 버려라.</strong> 66%면 합격이다.
어려운 두 문제를 포기하고 나머지를 확실히 하는 편이 낫다.
</div>

</v-click>

---
class: dense
---

## 가장 비싼 실수들

<v-clicks>

| 실수 | 대가 |
|---|---|
| **컨텍스트 전환 안 함** | 그 문제 전부 0점 |
| **네임스페이스 틀림** | 그 문제 전부 0점 |
| vim에 `expandtab` 없이 YAML 편집 | 파싱 에러로 문제 통째로 날림 |
| 노드에서 `exit` 안 하고 다음 문제 | 명령이 안 먹혀 시간 낭비 |
| `drain`에 `--ignore-daemonsets` 누락 | 에러에서 헤맴 |
| 업그레이드 시 **저장소 URL 안 바꿈** | 패키지를 못 찾아 막힘 |
| 만들고 확인 안 함 | 롤아웃 중인 상태로 넘어가 감점 |
| 한 문제에 20분 매달림 | 뒤의 쉬운 문제 3개를 못 품 |

</v-clicks>

<v-click>

<div class="pt-1">
<strong>위 8개 중 앞의 두 개가 압도적으로 많다.</strong> 이것만 안 해도 합격선에 가까워진다.
</div>

</v-click>

---

## 검산 습관

```bash
# 만들었으면 본다
k get <리소스> -n <ns>
k describe <리소스> <이름> -n <ns>

# 롤아웃은 끝날 때까지 기다린다
k rollout status deploy/web
k wait --for=condition=ready pod -l app=web --timeout=60s

# 연결은 실제로 해본다
k get endpoints web-svc
k run tmp --image=busybox:1.36 --rm -it --restart=Never -- wget -qO- http://web-svc

# 권한은 흉내내서 확인한다
k auth can-i <verb> <resource> -n <ns> --as=<user>

# 노드 작업은 최종 상태를 본다
k get nodes
```

<v-click>

<div class="pt-1">
<strong>"만들었다"와 "동작한다"는 다르다.</strong>
채점은 최종 상태만 보므로, 최종 상태를 본 사람만 점수를 가져간다.
</div>

</v-click>

---
class: denser
---

## 공식 문서에서 바로 가져올 것들

**손으로 치면 틀리는 것들이다. 무조건 복사한다.**

| 필요한 것 | 검색어 (kubernetes.io/docs) |
|---|---|
| NetworkPolicy | `network policies` — deny-all 포함 예제 5종 |
| nodeAffinity / podAffinity | `assign pods nodes` |
| PV / PVC / StorageClass | `persistent volumes` |
| Ingress + TLS | `ingress` |
| RBAC Role/Binding | `rbac` |
| CSR | `certificate signing requests` |
| etcd 백업·복구 | `operating etcd` |
| 업그레이드 | `upgrade kubeadm clusters` |
| probe 문법 | `configure liveness readiness startup probes` |
| CronJob 스케줄 | `cronjob` |
| HTTPRoute | (Gateway API 사이트) `http routing` |

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 연습할 때부터 <strong>이 페이지들을 찾아가는 경로를 몸에 익혀라.</strong>
검색창에 무엇을 칠지 아는 것 자체가 실력이다.
</div>

</v-click>

---

## 시험 전 2주 계획

<v-clicks>

| 시기 | 할 일 |
|---|---|
| **D-14** | killer.sh 1세션. 무엇이 약한지만 확인 (점수는 신경 쓰지 말 것) |
| **D-13~D-8** | 틀린 영역 집중. 특히 **15장(라이프사이클)** 반복 |
| **D-7~D-4** | killercoda로 **업그레이드·etcd·컨트롤 플레인 복구**를 각 5회 |
| **D-3** | killer.sh 2세션. 이번엔 **시간 안에** 푸는 연습 |
| **D-2** | 이 덱의 각 장 요약 슬라이드만 훑기 + 치트시트 손에 붙이기 |
| **D-1** | 새 걸 공부하지 말 것. 환경 점검(웹캠·신분증·책상) |

</v-clicks>

<v-click>

<div class="pt-1 text-sm opacity-80">
killer.sh는 <strong>실제 시험보다 어렵다.</strong> 거기서 60%를 받아도 실제로는 합격하는 경우가 많다.
점수에 낙담하지 말고 <strong>틀린 것의 해설을 전부 읽는 용도</strong>로 쓰자.
</div>

</v-click>

---

## 19장 요약

<v-clicks>

- 시작 30초에 **alias · `$do` · `~/.vimrc`(expandtab)** 를 만든다
- 문제마다 **① 컨텍스트 ② 네임스페이스 ③ 검산** 3단계를 반복한다
- **빈 파일에 YAML을 치지 말 것** — 생성기 / 문서 / 기존 리소스 복사
- **빨리 풀리는 것부터.** 5분 룰로 넘기고 2차 순회에서 돌아온다
- 가장 비싼 실수는 **컨텍스트·네임스페이스**. 이 둘만 안 틀려도 크게 유리하다
- **"만들었다"가 아니라 "동작한다"를 확인**하고 넘어간다
- 문서 복사 대상(NetworkPolicy·affinity·PV·etcd·업그레이드)은 **경로를 미리 익혀둔다**
- **66%면 합격이다.** 어려운 문제를 버리는 것도 전략이다

</v-clicks>
