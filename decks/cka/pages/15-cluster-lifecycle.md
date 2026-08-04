---
layout: section
---

# 15. 클러스터 라이프사이클

설치 · 업그레이드 · 백업 · 복구

---

## 이 장이 시험의 승부처다

<v-clicks>

- **커리큘럼의 25%**가 이 영역이다 (Cluster Architecture, Installation and Configuration)
- 그리고 **평소에 할 일이 없는 작업**들이다 — EKS/GKE를 쓰면 아예 못 만진다
- 문제 하나가 **10~15분**을 먹는다. 손에 안 붙어 있으면 시간에 진다

</v-clicks>

<v-click>

<div class="pt-4">
<strong>반복 말고는 방법이 없다.</strong> killercoda에서
<strong>업그레이드와 etcd 백업·복구를 각각 10회 이상</strong> 돌리는 것을 권한다.
</div>

</v-click>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 이 장의 명령들은 <strong>공식 문서에 그대로 있다.</strong>
<code>kubernetes.io/docs</code>에서 <code>upgrade kubeadm clusters</code>, <code>operating etcd</code>를
<strong>찾아가는 경로 자체를 연습</strong>해두면 시험장에서 그대로 쓸 수 있다.
</div>

</v-click>

---

## 노드 준비 — kubeadm 이전에 해야 할 것

```bash
# 1) 스왑 끄기 (kubelet의 기본 요구사항)
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab       # 재부팅 후에도 유지

# 2) 커널 모듈
cat <<EOF | sudo tee /etc/modules-load.d/k8s.conf
overlay
br_netfilter
EOF
sudo modprobe overlay && sudo modprobe br_netfilter

# 3) sysctl — 브리지 트래픽이 iptables를 타게 하고 포워딩을 켠다
cat <<EOF | sudo tee /etc/sysctl.d/k8s.conf
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF
sudo sysctl --system
```

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong>스왑이 켜져 있으면 kubelet이 시작을 거부한다.</strong>
<code>journalctl -u kubelet</code>에 그대로 찍힌다. 노드 트러블슈팅에서 자주 나온다.
</div>

</v-click>

---

## 컨테이너 런타임과 kubeadm 설치

```bash
# containerd 설치 후 — SystemdCgroup을 켜야 한다
sudo containerd config default | sudo tee /etc/containerd/config.toml
sudo sed -i 's/SystemdCgroup = false/SystemdCgroup = true/' /etc/containerd/config.toml
sudo systemctl restart containerd
```

```bash
# 패키지 저장소 — 마이너 버전마다 URL이 다르다  ★★
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.35/deb/Release.key \
  | sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] \
https://pkgs.k8s.io/core:/stable:/v1.35/deb/ /" \
  | sudo tee /etc/apt/sources.list.d/kubernetes.list

sudo apt-get update
sudo apt-get install -y kubelet kubeadm kubectl
sudo apt-mark hold kubelet kubeadm kubectl      # 자동 업그레이드 방지
```

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong>cgroup 드라이버가 안 맞으면</strong> Pod이 이상하게 죽는다.
containerd의 <code>SystemdCgroup = true</code>와 kubelet 설정이 <strong>둘 다 systemd</strong>여야 한다.
</div>

</v-click>

---

## kubeadm init

```bash
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=192.168.1.10 \
  --control-plane-endpoint=k8s-api.example.com:6443   # HA를 계획한다면 지금 넣어야 한다

# 출력 마지막의 안내대로
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

<v-clicks>

`init`이 하는 일 —

1. 사전 검사(preflight) → 2. **인증서 생성**(`/etc/kubernetes/pki/`) →
3. kubeconfig 생성 → 4. **스태틱 Pod 매니페스트 생성** → 5. kubelet 시작 →
6. 부트스트랩 토큰 생성 → 7. **CoreDNS·kube-proxy 애드온 설치**

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong><code>--control-plane-endpoint</code>는 나중에 추가하기 어렵다.</strong>
HA로 갈 가능성이 조금이라도 있으면 처음부터 넣어야 한다.
</div>

</v-click>

---

## CNI 설치 — 이걸 안 하면 노드가 NotReady

```bash
kubectl get nodes
# NAME           STATUS     ROLES           AGE   VERSION
# controlplane   NotReady   control-plane   1m    v1.35.0

kubectl describe node controlplane | grep -A5 Conditions
# Ready  False  ... container runtime network not ready:
#                   NetworkReady=false ... cni plugin not initialized
```

<v-clicks>

```bash
# 예: Calico
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/calico.yaml

# 잠시 후
kubectl get nodes            # Ready
kubectl get pods -n kube-system
```

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <code>--pod-network-cidr</code>과 <strong>CNI 매니페스트의 CIDR이 일치</strong>해야 한다.
Calico 기본은 <code>192.168.0.0/16</code>, Flannel은 <code>10.244.0.0/16</code>이다.
안 맞으면 Pod은 뜨는데 <strong>통신이 안 된다</strong> — 진단하기 까다로운 유형이다.
</div>

</v-click>

---

## 워커 노드 조인

```bash
# init 출력에 있던 명령을 워커에서 실행
sudo kubeadm join 192.168.1.10:6443 \
  --token abcdef.0123456789abcdef \
  --discovery-token-ca-cert-hash sha256:1234...
```

<v-clicks>

토큰은 **24시간 뒤 만료**된다. 잃어버렸다면 —

```bash
# 조인 명령을 통째로 다시 만든다  ★ 이게 제일 편하다
kubeadm token create --print-join-command

# 개별로 만들 때
kubeadm token list
kubeadm token create
openssl x509 -pubkey -in /etc/kubernetes/pki/ca.crt \
  | openssl rsa -pubin -outform der 2>/dev/null \
  | openssl dgst -sha256 -hex | sed 's/^.* //'
```

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — <strong><code>kubeadm token create --print-join-command</code></strong> 하나만 외우면 된다.
해시를 손으로 계산하는 명령은 외울 필요 없다.
</div>

</v-click>

---
class: dense
---

## 버전 스큐 규칙 — 업그레이드 순서의 근거

<v-clicks>

| 컴포넌트 | 허용 범위 |
|---|---|
| **kube-apiserver** | 기준점 |
| controller-manager, scheduler | apiserver보다 **1 마이너 낮은 것까지** |
| **kubelet** | apiserver보다 **3 마이너 낮은 것까지** |
| kube-proxy | 같은 노드의 kubelet과 동일 |
| **kubectl** | apiserver ±1 마이너 |

</v-clicks>

<v-click>

<div class="pt-2 text-lg">
<strong>여기서 두 가지 규칙이 나온다.</strong>
</div>

1. **컨트롤 플레인을 먼저, 워커를 나중에** 올린다
2. **마이너 버전을 건너뛸 수 없다.** 1.33 → 1.35 는 불가. 1.33 → 1.34 → 1.35

</v-click>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <code>kubeadm upgrade apply</code>는
<strong>두 단계 이상 점프를 거부</strong>한다. 시험에서 "1.34에서 1.35로" 처럼
<strong>한 단계만</strong> 요구하는 이유다.
</div>

</v-click>

---

## 업그레이드 — 첫 컨트롤 플레인 노드

```bash
# 1) 저장소 URL의 마이너 버전을 바꾼다  ★ 가장 많이 빠뜨리는 단계
sudo sed -i 's/v1.34/v1.35/' /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update

# 2) 설치 가능한 버전 확인
sudo apt-cache madison kubeadm | head

# 3) kubeadm 먼저 업그레이드
sudo apt-mark unhold kubeadm
sudo apt-get install -y kubeadm=1.35.1-1.1
sudo apt-mark hold kubeadm
kubeadm version

# 4) 계획 확인 — 무엇이 어떻게 바뀌는지 보여준다
sudo kubeadm upgrade plan

# 5) 적용 (컨트롤 플레인 컴포넌트를 교체한다)
sudo kubeadm upgrade apply v1.35.1
```

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong>1번을 안 하면 <code>apt-get install kubeadm=1.35.x</code>가
"버전을 찾을 수 없다"고 실패한다.</strong> 저장소가 여전히 1.34만 보고 있기 때문이다.
</div>

</v-click>

---

## 업그레이드 — kubelet과 kubectl

```bash
# 6) 노드를 비운다
kubectl drain controlplane --ignore-daemonsets

# 7) kubelet, kubectl 업그레이드
sudo apt-mark unhold kubelet kubectl
sudo apt-get install -y kubelet=1.35.1-1.1 kubectl=1.35.1-1.1
sudo apt-mark hold kubelet kubectl

# 8) kubelet 재시작
sudo systemctl daemon-reload
sudo systemctl restart kubelet

# 9) 다시 스케줄 가능하게
kubectl uncordon controlplane
kubectl get nodes
```

<v-clicks>

- **`kubeadm upgrade apply`는 kubelet을 올려주지 않는다.** 별도 단계다
- `systemctl daemon-reload`를 빠뜨리면 새 설정이 반영되지 않는다

</v-clicks>

---

## 업그레이드 — 나머지 노드

```bash
# 다른 컨트롤 플레인 노드 (apply가 아니라 node)
sudo sed -i 's/v1.34/v1.35/' /etc/apt/sources.list.d/kubernetes.list && sudo apt-get update
sudo apt-mark unhold kubeadm && sudo apt-get install -y kubeadm=1.35.1-1.1 && sudo apt-mark hold kubeadm
sudo kubeadm upgrade node                          # ★ apply 가 아니다

# 워커 노드
sudo sed -i 's/v1.34/v1.35/' /etc/apt/sources.list.d/kubernetes.list && sudo apt-get update
sudo apt-mark unhold kubeadm && sudo apt-get install -y kubeadm=1.35.1-1.1 && sudo apt-mark hold kubeadm
sudo kubeadm upgrade node                          # kubelet 설정만 갱신한다

# (컨트롤 플레인 노드에서) 비우기
kubectl drain node01 --ignore-daemonsets

# (워커에서) kubelet/kubectl 업그레이드 후
sudo systemctl daemon-reload && sudo systemctl restart kubelet

# (컨트롤 플레인 노드에서) 복귀
kubectl uncordon node01
```

<v-click>

<div class="exam-tip">
<strong>시험</strong> — <code>drain</code>/<code>uncordon</code>은 <strong>kubectl이 있는 곳에서</strong>,
패키지 설치는 <strong>대상 노드에 ssh해서</strong> 한다. 어디서 무엇을 치는지 헷갈리기 쉽다.
</div>

</v-click>

---

## 업그레이드 순서 요약 — 이것만 외우면 된다

<div class="text-lg py-2">

**컨트롤 플레인 1번 노드**
1. 저장소 URL 변경 → 2. `kubeadm` 설치 → 3. **`kubeadm upgrade apply vX.Y.Z`**
4. `drain` → 5. `kubelet`/`kubectl` 설치 → 6. `daemon-reload` + `restart` → 7. `uncordon`

**나머지 노드 (컨트롤 플레인·워커 공통)**
1. 저장소 URL 변경 → 2. `kubeadm` 설치 → 3. **`kubeadm upgrade node`**
4. `drain` → 5. `kubelet`/`kubectl` 설치 → 6. `daemon-reload` + `restart` → 7. `uncordon`

</div>

<v-clicks>

<div class="pt-1">
<strong>차이는 3번 하나뿐이다.</strong> 첫 노드만 <code>apply</code>, 나머지는 전부 <code>node</code>.
</div>

</v-clicks>

<v-click>

```bash
kubectl get nodes          # 전부 새 VERSION 인지 확인 — 이게 채점 기준이다
```

</v-click>

---

## 인증서 관리

```bash
sudo kubeadm certs check-expiration
# CERTIFICATE              EXPIRES                RESIDUAL TIME
# admin.conf               Aug 04, 2027           364d
# apiserver                Aug 04, 2027           364d
# apiserver-etcd-client    Aug 04, 2027           364d
# ...
# CERTIFICATE AUTHORITY    EXPIRES                RESIDUAL TIME
# ca                       Aug 02, 2035           9y
```

<v-clicks>

```bash
sudo kubeadm certs renew all                    # 전부 갱신
sudo kubeadm certs renew apiserver              # 하나만
```

- 클라이언트 인증서는 **1년**, CA는 **10년** 유효하다
- **`kubeadm upgrade`를 하면 인증서가 자동 갱신된다** — 매년 업그레이드하면 신경 쓸 일이 없다
- 갱신 후 컨트롤 플레인 스태틱 Pod을 **재시작**해야 반영된다

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — 인증서가 만료되면 <code>kubectl</code>이
<code>x509: certificate has expired</code> 로 전부 죽는다.
<strong><code>$HOME/.kube/config</code>도 다시 복사</strong>해야 한다 (`admin.conf`가 갱신되므로).
</div>

</v-click>

---

## etcd 접근 준비

```bash
kubectl get pods -n kube-system -l component=etcd
sudo cat /etc/kubernetes/manifests/etcd.yaml | grep -E 'listen-client-urls|cert-file|key-file|trusted-ca-file|data-dir'
```

```bash
# 인증서 경로를 확인했으면 이렇게 쓴다
export ETCDCTL_API=3
sudo etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member list
```

<v-clicks>

<div class="exam-tip">
<strong>시험</strong> — 인증서 경로를 <strong>추측하지 말고
<code>/etc/kubernetes/manifests/etcd.yaml</code>에서 읽어라.</strong>
문제마다 경로가 다를 수 있다. <code>grep</code> 한 번이면 된다.
</div>

</v-clicks>

---

## etcd 백업

```bash
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot save /opt/etcd-backup.db

# 확인
sudo ETCDCTL_API=3 etcdctl --write-out=table snapshot status /opt/etcd-backup.db
# 또는 최신 etcd에서는
sudo etcdutl --write-out=table snapshot status /opt/etcd-backup.db
```

<v-clicks>

- **`snapshot save`에는 인증서가 필요**하다 (살아 있는 etcd에 접속하므로)
- **`snapshot status`에는 필요 없다** (파일만 읽는다)
- 최신 etcd에서는 파일 조작용 명령이 **`etcdutl`** 로 분리되었다

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <code>etcdctl</code>이 없다는 에러가 나면
<code>apt install etcd-client</code> 하거나, etcd Pod 안에서 <code>kubectl exec</code>로 실행한다.
</div>

</v-click>

---

## etcd 복구

```bash
# 1) 스냅샷을 새 디렉터리로 복원 (기존 데이터 디렉터리를 덮지 않는다)
sudo ETCDCTL_API=3 etcdctl snapshot restore /opt/etcd-backup.db \
  --data-dir=/var/lib/etcd-restore
# 최신 etcd:
sudo etcdutl snapshot restore /opt/etcd-backup.db --data-dir=/var/lib/etcd-restore

# 2) etcd 스태틱 Pod이 새 디렉터리를 보게 한다
sudo vim /etc/kubernetes/manifests/etcd.yaml
```

```yaml
    volumes:
      - name: etcd-data
        hostPath:
          path: /var/lib/etcd-restore     # ← 여기를 바꾼다
          type: DirectoryOrCreate
```

<v-clicks>

- kubelet이 파일 변경을 감지해 **etcd Pod을 자동으로 다시 만든다**
- API 서버도 잠시 끊겼다가 돌아온다. 1~2분 기다린다

</v-clicks>

<v-click>

```bash
kubectl get pods -n kube-system      # 돌아왔는지 확인
kubectl get nodes
```

</v-click>

---

## 복구에서 자주 틀리는 지점

<v-clicks>

<div class="pitfall">
<strong>함정 1</strong> — <code>--data-dir</code>을 <strong>기존 <code>/var/lib/etcd</code>로 지정</strong>하면
"디렉터리가 비어 있지 않다"며 실패한다. <strong>새 디렉터리</strong>로 복원하는 것이 정석이다.
</div>

<div class="pitfall">
<strong>함정 2</strong> — <code>hostPath.path</code>만 바꾸고
<strong><code>volumeMounts</code>의 <code>mountPath</code>는 그대로 둬야</strong> 한다.
컨테이너 안 경로(<code>/var/lib/etcd</code>)는 <code>--data-dir</code> 인자와 맞아야 하기 때문이다.
</div>

<div class="pitfall">
<strong>함정 3</strong> — 복원한 디렉터리의 <strong>소유권</strong>이 맞아야 한다.
안 뜨면 <code>crictl logs</code>로 permission 에러를 확인하고 <code>chown</code> 한다.
</div>

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 복구 후 <strong><code>kubectl get pods -A</code>가 백업 시점의 상태를 보여주면 성공</strong>이다.
바로 안 뜨면 <code>sudo crictl ps -a | grep etcd</code> 로 컨테이너 상태를 본다.
</div>

</v-click>

---

## HA 컨트롤 플레인 — 두 가지 토폴로지

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**Stacked etcd**

etcd가 컨트롤 플레인 노드 **안에** 있다.

- 노드 3대면 끝. 구성이 단순
- **kubeadm의 기본**
- 노드 하나를 잃으면 **API 서버와 etcd 멤버를 함께** 잃는다

</div>
<div>

**External etcd**

etcd가 **별도 클러스터**로 분리된다.

- 노드 6대 이상 필요
- 장애 영향이 분리된다
- 운영 복잡도가 높다

</div>
</div>

<v-clicks>

**공통 요구사항**

- **컨트롤 플레인 노드는 홀수(3, 5)** — etcd의 Raft 합의 때문
- 앞단에 **로드밸런서**가 필요하다 (haproxy + keepalived 등)
- `kubeadm init --control-plane-endpoint=<LB주소>:6443` 으로 시작해야 한다

</v-clicks>

<v-click>

```bash
kubeadm token create --print-join-command --certificate-key $(kubeadm init phase upload-certs --upload-certs | tail -1)
# → 여기에 --control-plane 을 붙이면 컨트롤 플레인으로 조인한다
```

</v-click>

---

## etcd 멤버 관리

```bash
sudo ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member list -w table

# 상태 확인 (누가 리더인가)
... endpoint status --cluster -w table
... endpoint health --cluster
```

<v-clicks>

| 멤버 수 | 과반 | 견딜 수 있는 장애 |
|---|---|---|
| 1 | 1 | 0 |
| **3** | 2 | **1** |
| 4 | 3 | 1 (4대는 3대보다 낫지 않다) |
| **5** | 3 | **2** |

</v-clicks>

<v-click>

<div class="pt-1">
<strong>짝수는 의미가 없다.</strong> 4대는 3대와 내결함성이 같으면서 쓰기 지연만 늘어난다.
그래서 항상 <strong>3 또는 5</strong>다.
</div>

</v-click>

---

## 노드 추가와 제거

```bash
# 추가
kubeadm token create --print-join-command       # 컨트롤 플레인에서
sudo kubeadm join ...                           # 새 노드에서

# 제거
kubectl drain node02 --ignore-daemonsets --delete-emptydir-data
kubectl delete node node02                      # 클러스터에서 뺀다

# 해당 노드에서 (재사용하려면)
sudo kubeadm reset -f
sudo rm -rf /etc/cni/net.d /var/lib/cni
sudo iptables -F && sudo iptables -t nat -F
```

<v-clicks>

- `kubectl delete node`는 **오브젝트만 지운다.** 노드의 프로세스는 계속 돈다
- **`kubeadm reset`** 이 실제로 설정과 데이터를 지운다
- 컨트롤 플레인 노드를 뺄 때는 **etcd 멤버에서도 제거**해야 한다 (`etcdctl member remove`)

</v-clicks>

---
class: denser
---

## kubelet 설정 바꾸기

```bash
# kubelet 설정 파일
sudo vim /var/lib/kubelet/config.yaml
sudo systemctl daemon-reload
sudo systemctl restart kubelet
sudo systemctl status kubelet
sudo journalctl -u kubelet -f --no-pager
```

<v-clicks>

자주 만지는 항목 —

| 필드 | 의미 |
|---|---|
| `staticPodPath` | 스태틱 Pod 디렉터리 |
| `cgroupDriver` | `systemd` (런타임과 일치해야) |
| `maxPods` | 노드당 Pod 상한 (기본 110) |
| `evictionHard` | 축출 임계값 (`memory.available`, `nodefs.available`) |
| `clusterDNS` / `clusterDomain` | Pod에 넣을 DNS 설정 |
| `authentication` / `authorization` | kubelet API 접근 제어 |

</v-clicks>

<v-click>

<div class="pt-1 text-sm opacity-80">
kubeadm 클러스터에서는 이 설정이 <code>kube-system</code>의
<code>kubelet-config</code> ConfigMap에도 있다. 노드 파일이 실제로 쓰이는 것이다.
</div>

</v-click>

---

## 클러스터 건강 점검 루틴

```bash
# 1) 노드
kubectl get nodes -o wide
kubectl describe node <노드> | grep -A10 Conditions

# 2) 컨트롤 플레인 컴포넌트
kubectl get pods -n kube-system
kubectl get componentstatuses           # deprecated지만 시험에 나올 수 있다

# 3) 시스템 서비스 (노드에서)
sudo systemctl status kubelet containerd
sudo crictl ps -a | grep -E 'apiserver|etcd|scheduler|controller'

# 4) 인증서와 etcd
sudo kubeadm certs check-expiration
sudo etcdctl endpoint health --cluster ...

# 5) 이벤트
kubectl get events -A --sort-by=.lastTimestamp | tail -30
```

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 트러블슈팅 문제를 만나면 이 순서로 훑는 것이 가장 빠르다.
<strong>"어느 층에서 끊겼는지"</strong> 를 먼저 확정한 뒤 그 층을 파고든다. (18장)
</div>

</v-click>

---

## 15장 요약

<v-clicks>

- 노드 준비: **swap off · br_netfilter · ip_forward · SystemdCgroup**
- **저장소 URL에 마이너 버전이 박혀 있다.** 업그레이드 시 **가장 많이 빠뜨리는 단계**
- 버전 스큐 → **컨트롤 플레인 먼저, 마이너 건너뛰기 불가**
- 업그레이드: **첫 노드는 `upgrade apply`, 나머지는 `upgrade node`.** 나머지 단계는 동일
- **`kubeadm upgrade`는 kubelet을 안 올린다** — 별도 설치 + `daemon-reload` + `restart`
- 조인 토큰은 **`kubeadm token create --print-join-command`**
- etcd 백업은 **인증서 3종 + `snapshot save`**, 경로는 `etcd.yaml`에서 읽는다
- 복구는 **새 디렉터리로 restore → `etcd.yaml`의 `hostPath` 변경**
- **etcd 멤버는 홀수(3, 5).** 짝수는 이득이 없다
- 인증서는 1년. **`kubeadm certs check-expiration` / `renew all`**

</v-clicks>
