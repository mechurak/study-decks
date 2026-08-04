---
layout: section
---

# 18. 트러블슈팅

배점 30% — 앞의 모든 장이 재료다

---

## 진단의 원칙

<div class="text-2xl py-6 leading-relaxed">
<strong>고치려 하지 말고, 먼저 "어느 층에서 끊겼는지"를 확정하라.</strong>
</div>

<v-clicks>

층은 넷이다.

1. **애플리케이션** — Pod 자체의 문제
2. **노드** — kubelet, 런타임, 자원
3. **컨트롤 플레인** — API 서버, 스케줄러, 컨트롤러, etcd
4. **네트워크** — Service, DNS, CNI, 정책

</v-clicks>

<v-click>

<div class="pt-3">
각 층은 <strong>확인 명령이 다르다.</strong> 층을 잘못 짚으면 엉뚱한 곳을 파게 된다.
시험에서는 이 판별이 곧 시간이다.
</div>

</v-click>

---

## 층을 가르는 세 가지 질문

```bash
# Q1. kubectl 이 되는가?
kubectl get nodes
```
<v-clicks>

- **안 된다** → **컨트롤 플레인** 층. `crictl`과 `journalctl`로 내려간다
- 된다 → 다음 질문

```bash
# Q2. 노드가 전부 Ready 인가?
kubectl get nodes
```

- **NotReady가 있다** → **노드** 층. kubelet과 CNI를 본다
- 전부 Ready → 다음 질문

```bash
# Q3. Pod이 Running 이고 Ready 인가?
kubectl get pods -A | grep -vE 'Running|Completed'
```

- **아니다** → **애플리케이션** 층
- Running인데 통신이 안 된다 → **네트워크** 층

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 문제를 열면 <strong>무조건 이 세 줄부터</strong> 친다. 20초면 층이 확정된다.
</div>

</v-click>

---
class: dense
---

## 도구 지도

| 상황 | 도구 |
|---|---|
| 왜 안 뜨는가 | **`kubectl describe`** → Events |
| 앱이 무슨 말을 하는가 | **`kubectl logs`**, `logs --previous` |
| 시간순으로 무슨 일이 있었나 | **`kubectl get events --sort-by=.lastTimestamp`** |
| 정확한 값이 뭔가 | `kubectl get ... -o yaml` |
| 자원을 얼마나 쓰나 | **`kubectl top`**, `describe node` |
| 안에서 확인하고 싶다 | `kubectl exec`, `kubectl debug`, 임시 Pod |
| kubectl이 안 될 때 | **`crictl`**, **`journalctl -u kubelet`** |
| 노드 자체 | `systemctl status`, `df -h`, `free -m`, `dmesg` |

<v-click>

<div class="pt-1">
<strong>순서가 중요하다.</strong> <code>describe</code>(Events) → <code>logs</code> → <code>-o yaml</code>.
로그부터 보면 스케줄링·볼륨·이미지 문제는 <strong>아무것도 안 나온다.</strong>
</div>

</v-click>

---
class: denser
---

## Pod 상태별 진단 — 전체 지도

| STATUS | 층 | 첫 명령 |
|---|---|---|
| `Pending` | 스케줄링 | `describe pod` → Events |
| `ContainerCreating` | 볼륨/네트워크 | `describe pod` → Events |
| `ImagePullBackOff` | 이미지 | `describe pod` → Events |
| `CrashLoopBackOff` | 앱 | **`logs --previous`** |
| `Error` | 앱 | `logs`, exit code |
| `OOMKilled` | 리소스 | `describe pod` → Last State |
| `CreateContainerConfigError` | 설정 | `describe pod` → ConfigMap/Secret |
| `Running` 인데 `0/1` | readinessProbe | `describe pod` → Events |
| `Terminating` 지속 | finalizer / 노드 | `get pod -o yaml` |
| `Completed` 반복 | restartPolicy | Job 여부 확인 |

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 이 표가 애플리케이션 층 문제의 <strong>거의 전체</strong>다.
STATUS를 보는 순간 다음 명령이 정해져야 한다.
</div>

</v-click>

---
class: denser
---

## Pending

```bash
kubectl describe pod web | grep -A20 Events
```

<v-clicks>

| 메시지 | 원인 | 조치 |
|---|---|---|
| `Insufficient cpu/memory` | request 여유 부족 | request 낮추거나 노드 추가 |
| `had untolerated taint` | taint | toleration 추가 또는 taint 제거 |
| `didn't match node affinity/selector` | 라벨 불일치 | 노드에 라벨 추가 또는 셀렉터 수정 |
| `node(s) were unschedulable` | cordon | `kubectl uncordon` |
| `unbound immediate PersistentVolumeClaims` | PVC 미바인딩 | 13장 |
| `didn't match pod anti-affinity rules` | antiAffinity | 7장 |
| **Events 자체가 없다** | **스케줄러가 죽었다** 또는 `schedulerName` 오타 | 컨트롤 플레인 확인 |

</v-clicks>

<v-click>

```bash
kubectl describe node node01 | grep -A8 'Allocated resources'
kubectl get nodes                    # SchedulingDisabled 표시
```

</v-click>

---
class: denser
---

## ImagePullBackOff

```bash
kubectl describe pod web | grep -A5 Events
# Failed to pull image "nginx:1.99": rpc error: ... not found
```

<v-clicks>

| Events 내용 | 원인 |
|---|---|
| `not found` / `manifest unknown` | **이미지 이름·태그 오타** |
| `unauthorized` / `authentication required` | **`imagePullSecrets` 없음** |
| `dial tcp: i/o timeout` | 네트워크·레지스트리 접근 불가 |
| `no such host` | 레지스트리 도메인 해석 실패 |

</v-clicks>

<v-click>

```bash
# 이미지 이름이 맞는지 확인
kubectl get pod web -o jsonpath='{.spec.containers[*].image}'

# 노드에서 직접 받아보기
sudo crictl pull nginx:1.27

# 고치기
kubectl set image deploy/web nginx=nginx:1.27
```

</v-click>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <code>imagePullPolicy: Always</code>인데 레지스트리에 못 붙으면
<strong>노드에 이미지가 이미 있어도 실패</strong>한다.
로컬 이미지를 쓰려면 <code>IfNotPresent</code> 또는 <code>Never</code>가 필요하다.
</div>

</v-click>

---
class: denser
---

## CrashLoopBackOff

```bash
kubectl logs web --previous                    # ★ 죽기 직전 로그
kubectl describe pod web | grep -A15 'Last State'
# Last State:  Terminated
#   Reason:    Error
#   Exit Code: 1
```

<v-clicks>

| Exit Code | 의미 | 다음 행동 |
|---|---|---|
| `0` | 정상 종료했는데 `restartPolicy: Always` | 명령이 즉시 끝난다 — `sleep`이 필요하거나 Job이어야 한다 |
| `1`, `2` | 앱 에러 | 로그를 읽는다 |
| `126` | 실행 권한 없음 | command 경로·권한 |
| `127` | 명령을 못 찾음 | **`command` 오타** 또는 이미지에 그 바이너리가 없다 |
| `137` | SIGKILL | **OOMKilled** 또는 liveness 실패로 강제 종료 |
| `143` | SIGTERM | 정상 종료 신호 |

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — 로그가 <strong>비어 있는데</strong> 계속 죽는다면
liveness 프로브를 의심한다. <code>describe</code>의 Events에
<code>Liveness probe failed</code> 가 반복되고 있을 것이다 (4장).
</div>

</v-click>

---

## OOMKilled

```bash
kubectl describe pod web | grep -A8 'Last State'
# Last State:  Terminated
#   Reason:    OOMKilled
#   Exit Code: 137
```

<v-clicks>

```bash
kubectl top pod web --containers               # 실제 사용량
kubectl get pod web -o jsonpath='{.spec.containers[0].resources}'
```

</v-clicks>

<v-click>

**조치 순서**

1. `kubectl top`으로 **실제 사용량**을 본다
2. `limits.memory`를 실사용의 **1.5~2배**로 올린다
3. 그래도 계속 오르면 **앱의 메모리 누수**다 — 인프라 문제가 아니다

</v-click>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong>노드 전체 메모리 부족과 컨테이너 limit 초과는 다르다.</strong><br>
컨테이너 limit 초과 → <code>OOMKilled</code>, 해당 컨테이너만 재시작<br>
노드 메모리 부족 → <strong>kubelet이 Pod을 축출(Evicted)</strong>, QoS 순서대로 (6장)
</div>

</v-click>

---
class: dense
---

## ContainerCreating에서 멈춤

```bash
kubectl describe pod web | grep -A20 Events
```

<v-clicks>

| 메시지 | 원인 |
|---|---|
| `MountVolume.SetUp failed ... not found` | **ConfigMap/Secret이 없다** |
| `Unable to attach or mount volumes` | PV/CSI 문제 (13장) |
| `Multi-Attach error` | **RWO 볼륨을 두 노드에서** |
| `failed to create pod sandbox ... cni` | **CNI 문제** |
| `network plugin is not ready` | CNI Pod이 안 떴다 |

</v-clicks>

<v-click>

```bash
# 볼륨 관련
kubectl get cm,secret -n <ns>
kubectl get pvc,pv

# CNI 관련
kubectl get pods -n kube-system | grep -Ei 'calico|cilium|flannel'
ls /etc/cni/net.d/
sudo journalctl -u kubelet | grep -i cni | tail -20
```

</v-click>

---

## Running인데 Ready가 아니다 (0/1)

```bash
kubectl get pods
# NAME   READY   STATUS    RESTARTS   AGE
# web    0/1     Running   0          3m

kubectl describe pod web | grep -A10 Events
# Warning  Unhealthy  Readiness probe failed: HTTP probe failed with statuscode: 404
```

<v-clicks>

- **readinessProbe가 실패하고 있다** — 컨테이너는 살아 있다
- 결과: **Service 엔드포인트에서 빠진다** → 트래픽이 안 온다

</v-clicks>

<v-click>

```bash
# 프로브 설정 확인
kubectl get pod web -o jsonpath='{.spec.containers[0].readinessProbe}'

# 안에서 직접 호출해본다
kubectl exec -it web -- wget -qO- http://localhost:8080/healthz
```

</v-click>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — "Service에 연결이 안 된다"인데 엔드포인트가 비어 있고
Pod은 Running이면 <strong>거의 항상 readinessProbe</strong>다.
경로나 포트 오타를 <code>kubectl edit</code>으로 고치면 된다.
</div>

</v-click>

---
class: denser
---

## Terminating이 끝나지 않는다

```bash
kubectl get pod web -o yaml | grep -A5 finalizers
kubectl get ns stuck -o yaml | grep -A5 finalizers
```

<v-clicks>

| 원인 | 조치 |
|---|---|
| **finalizer**가 남아 있고 처리할 컨트롤러가 없다 | finalizer 제거 |
| 노드가 **unreachable** | 노드 복구 또는 강제 삭제 |
| `preStop` 훅이 안 끝난다 | grace period 확인 |

</v-clicks>

<v-click>

```bash
# Pod 강제 삭제
kubectl delete pod web --force --grace-period=0

# finalizer 제거
kubectl patch pod web -p '{"metadata":{"finalizers":null}}' --type=merge

# 네임스페이스가 Terminating에서 안 끝날 때
kubectl get ns stuck -o json \
  | jq '.spec.finalizers = []' \
  | kubectl replace --raw "/api/v1/namespaces/stuck/finalize" -f -
```

</v-click>

<v-click>

<div class="pitfall">
<strong>함정</strong> — 네임스페이스가 <code>Terminating</code>에 걸리는 흔한 원인은
<strong>죽은 APIService</strong>다. <code>kubectl get apiservices | grep False</code> 로 확인하고,
안 쓰는 것이면 지운다.
</div>

</v-click>

---

## 로그 다루기 — 커리큘럼의 "컨테이너 출력 스트림"

```bash
kubectl logs web
kubectl logs web -c sidecar                    # 멀티 컨테이너
kubectl logs web --previous                    # 이전 컨테이너
kubectl logs web -f --tail=100
kubectl logs web --since=15m --timestamps
kubectl logs -l app=web --all-containers --prefix --max-log-requests=10
kubectl logs deploy/web                        # 컨트롤러 지정
kubectl logs job/import
```

<v-clicks>

- 컨테이너는 **stdout / stderr**로 로그를 낸다. 파일에 쓰면 kubectl로 안 보인다
- 실체: 노드의 **`/var/log/pods/<ns>_<pod>_<uid>/<container>/0.log`**
- `/var/log/containers/` 는 거기로 향하는 심볼릭 링크다

</v-clicks>

<v-click>

```bash
# kubectl이 안 될 때 노드에서 직접
sudo ls /var/log/containers/
sudo tail -f /var/log/containers/kube-apiserver-*.log
sudo crictl logs <container-id>
```

</v-click>

---

## 리소스 사용량 모니터링

```bash
kubectl top nodes
kubectl top pods -A --sort-by=memory
kubectl top pod web --containers

kubectl describe node node01 | grep -A10 'Allocated resources'
kubectl get pods -A -o wide --field-selector spec.nodeName=node01
```

<v-clicks>

<div class="pitfall">
<strong>함정</strong> — <strong><code>describe node</code>의 "Allocated resources"는 request의 합이고,
<code>kubectl top</code>은 실제 사용량이다.</strong> 두 숫자가 크게 다른 것이 정상이다.<br>
"자원이 남았는데 Pending" → <strong>request 합</strong>을 보라<br>
"Pod이 자꾸 죽는다" → <strong>실제 사용량</strong>을 보라
</div>

</v-clicks>

<v-click>

```bash
# 노드에서 직접
df -h                        # 디스크
free -m                      # 메모리
top                          # CPU
sudo journalctl -u kubelet | grep -i evict
```

</v-click>

---
class: dense
---

## 노드가 NotReady

```bash
kubectl get nodes
kubectl describe node node01 | grep -A15 Conditions
```

<v-clicks>

| Condition | 원인 |
|---|---|
| `Ready: False`, `KubeletNotReady`, `cni plugin not initialized` | **CNI 미설치/고장** |
| `Ready: Unknown`, `NodeStatusUnknown` | **kubelet이 보고를 멈췄다** |
| `MemoryPressure: True` | 메모리 부족 → 축출 시작 |
| `DiskPressure: True` | 디스크 부족 → 이미지 GC, 축출 |
| `PIDPressure: True` | 프로세스 수 초과 |

</v-clicks>

<v-click>

```bash
# 노드에 들어가서
ssh node01
sudo systemctl status kubelet
sudo journalctl -u kubelet -n 100 --no-pager      # ★ 여기에 이유가 있다
sudo systemctl status containerd
df -h /var/lib/kubelet /var/lib/containerd
free -m
sudo swapon --show                                 # 스왑이 켜졌나
```

</v-click>

---
class: denser
---

## kubelet이 안 뜬다 — 체크리스트

<v-clicks>

```bash
sudo systemctl status kubelet
sudo journalctl -u kubelet -n 50 --no-pager
```

| 로그 메시지 | 원인 | 조치 |
|---|---|---|
| `failed to run Kubelet: running with swap on` | 스왑 | `swapoff -a` |
| `misconfiguration: kubelet cgroup driver ... != ...` | cgroup 드라이버 불일치 | containerd `SystemdCgroup = true` |
| `x509: certificate has expired` | 인증서 만료 | `kubeadm certs renew` |
| `Unable to register node ... connection refused` | **API 서버가 죽었다** | 컨트롤 플레인을 본다 |
| `open /var/lib/kubelet/config.yaml: no such file` | 설정 파일 없음 | `kubeadm` 재초기화 필요 |
| `failed to load kubelet config file` | **YAML 문법 오류** | 파일을 되돌린다 |

</v-clicks>

<v-click>

```bash
sudo systemctl restart kubelet
sudo systemctl enable kubelet                    # 부팅 시 자동 시작
sudo systemctl daemon-reload                     # 설정 파일을 바꿨다면
```

</v-click>

---

## kubectl이 아예 안 된다

```bash
kubectl get nodes
# The connection to the server 192.168.1.10:6443 was refused
```

<v-clicks>

**순서대로 확인한다.**

```bash
# 1) kubeconfig가 맞는가
kubectl config current-context
ls -l ~/.kube/config
kubectl cluster-info

# 2) API 서버 컨테이너가 도는가  ★ 컨트롤 플레인 노드에서
sudo crictl ps -a | grep kube-apiserver

# 3) 죽었다면 왜 죽었는가
sudo crictl logs $(sudo crictl ps -a --name kube-apiserver -q | head -1)

# 4) kubelet이 매니페스트를 읽고 있는가
sudo journalctl -u kubelet -n 50 --no-pager | grep -i apiserver

# 5) 매니페스트 자체 확인
sudo cat /etc/kubernetes/manifests/kube-apiserver.yaml
```

</v-clicks>

---

## API 서버가 안 뜨는 전형적 원인

<v-clicks>

| 원인 | 증상 | 조치 |
|---|---|---|
| **매니페스트 YAML 문법 오류** | 컨테이너가 아예 안 생긴다 | `journalctl -u kubelet`에 파싱 에러 |
| **잘못된 플래그** | 컨테이너가 즉시 죽는다 | `crictl logs`에 `unknown flag` |
| **etcd에 못 붙는다** | `connection refused` 반복 | etcd 컨테이너 확인 |
| **인증서 만료/경로 오류** | `x509` 에러 | `kubeadm certs check-expiration` |
| **포트 충돌** | `bind: address already in use` | 6443을 쓰는 프로세스 확인 |

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — "고장난 컨트롤 플레인을 고치시오"는 <strong>거의 항상
<code>/etc/kubernetes/manifests/*.yaml</code>이 손상된 것</strong>이다.<br>
포트 번호, 인증서 경로, <code>--etcd-servers</code> 주소 같은 값이 한 글자 틀려 있다.
<strong>고치고 저장하면 kubelet이 자동으로 다시 만든다.</strong>
</div>

</v-click>

<v-click>

```bash
sudo cp /etc/kubernetes/manifests/kube-apiserver.yaml /tmp/backup.yaml   # 먼저 백업
sudo vim /etc/kubernetes/manifests/kube-apiserver.yaml
watch sudo crictl ps                              # 다시 뜨는지 지켜본다
```

</v-click>

---

## 스케줄러 · 컨트롤러 매니저가 죽었을 때

<v-clicks>

**증상이 다르다.**

| 죽은 것 | 증상 |
|---|---|
| **kube-scheduler** | 새 Pod이 **영원히 Pending**. Events가 비어 있다 |
| **kube-controller-manager** | Deployment를 만들어도 **ReplicaSet/Pod이 안 생긴다**. 노드 상태가 갱신 안 됨 |

</v-clicks>

<v-click>

```bash
kubectl get pods -n kube-system | grep -E 'scheduler|controller'
kubectl logs -n kube-system kube-scheduler-controlplane
sudo crictl ps -a | grep -E 'scheduler|controller'
sudo cat /etc/kubernetes/manifests/kube-scheduler.yaml
```

</v-click>

<v-click>

```bash
# 스케줄러가 죽은 상태에서 Pod을 띄워야 한다면
kubectl run web --image=nginx --dry-run=client -o yaml > pod.yaml
# spec.nodeName: node01 을 추가한 뒤
kubectl apply -f pod.yaml
```

</v-click>

<v-click>

<div class="pt-1 text-sm opacity-80">
컨트롤 플레인 컴포넌트의 로그는 <code>kubectl logs -n kube-system</code>으로 볼 수 있다
— <strong>API 서버가 살아 있을 때만</strong>. 아니면 <code>crictl logs</code>.
</div>

</v-click>

---

## etcd 문제

```bash
sudo crictl ps -a | grep etcd
sudo crictl logs $(sudo crictl ps -a --name etcd -q | head -1) 2>&1 | tail -30

sudo ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint health --cluster
```

<v-clicks>

| 증상 | 원인 |
|---|---|
| `database space exceeded` | 쿼터 초과 → compact + defrag 필요 |
| `no leader` / `context deadline exceeded` | **과반이 안 산다** — 멤버를 확인 |
| API 서버 로그의 `etcdserver: request timed out` | etcd가 느리다 (디스크 I/O) |
| 데이터 디렉터리 권한 오류 | 복구 후 `chown` 누락 (15장) |

</v-clicks>

<v-click>

<div class="pt-1">
<strong>etcd가 죽으면 API 서버도 못 뜬다.</strong> API 서버 로그에 etcd 관련 에러가 있으면
<strong>etcd부터</strong> 고쳐야 한다.
</div>

</v-click>

---

## 네트워킹 진단 — 안에서 밖으로

```bash
# ① 앱이 포트를 열었는가
kubectl exec -it web -- wget -qO- http://localhost:8080

# ② Pod IP로 직접
kubectl get pod web -o wide
kubectl run tmp --image=busybox:1.36 --rm -it --restart=Never -- wget -qO- http://10.244.1.5:8080

# ③ Service(ClusterIP)로
kubectl get endpoints web-svc                  # ★ 비어 있으면 여기가 문제
kubectl run tmp --image=busybox:1.36 --rm -it --restart=Never -- wget -qO- http://web-svc:80

# ④ DNS로
kubectl run tmp --image=busybox:1.36 --rm -it --restart=Never -- nslookup web-svc

# ⑤ 외부에서
curl http://<노드IP>:30080
kubectl describe ingress web
```

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 이 다섯 단계를 순서대로 하면
<strong>어느 계층에서 끊겼는지가 자동으로 나온다.</strong> 추측하지 말고 한 겹씩 벗길 것.
</div>

</v-click>

---
class: dense
---

## 네트워킹 증상 → 원인 표

| 증상 | 원인 후보 | 확인 |
|---|---|---|
| 엔드포인트가 비어 있다 | 라벨 불일치 / Pod 미Ready | `describe svc`, `get pods --show-labels` |
| ClusterIP만 안 된다 | kube-proxy 문제 | `kubectl get ds kube-proxy -n kube-system` |
| 이름만 안 된다 | CoreDNS | `nslookup kubernetes.default` |
| 특정 Pod끼리만 안 된다 | **NetworkPolicy** | `kubectl get netpol -A` |
| 노드 간 Pod 통신이 안 된다 | **CNI** | CNI Pod 상태, `/etc/cni/net.d/` |
| 외부에서만 안 된다 | NodePort 범위 / 방화벽 / LB | `describe svc` |
| Ingress에서 404 / 503 | 규칙·백엔드 Service | `describe ingress`, 컨트롤러 로그 |
| egress가 전부 안 된다 | **NetworkPolicy의 DNS 미허용** | 12장 |

<v-click>

<div class="pt-1 text-sm opacity-80">
kube-proxy가 죽으면 <strong>Pod-to-Pod 직접 통신은 정상이고 ClusterIP만 죽는다.</strong>
이 비대칭이 판별의 실마리다.
</div>

</v-click>

---
class: dense
---

## 인증서 문제

```bash
sudo kubeadm certs check-expiration

# 개별 인증서 확인
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -text | grep -A2 Validity
sudo openssl x509 -in /etc/kubernetes/pki/apiserver.crt -noout -text | grep -A3 'Subject Alternative Name'
```

<v-clicks>

| 에러 | 원인 |
|---|---|
| `x509: certificate has expired` | 만료 → `kubeadm certs renew all` |
| `x509: certificate signed by unknown authority` | CA 불일치 — kubeconfig의 CA 확인 |
| `x509: cannot validate certificate for <IP>` | SAN에 그 IP가 없다 |
| `Unauthorized` (401) | 토큰/인증서가 유효하지 않다 |

</v-clicks>

<v-click>

```bash
sudo kubeadm certs renew all
# 컨트롤 플레인 Pod 재시작 (매니페스트를 잠시 옮겼다 되돌린다)
sudo mv /etc/kubernetes/manifests /tmp/m && sleep 20 && sudo mv /tmp/m /etc/kubernetes/manifests

# admin.conf도 갱신되었으므로 다시 복사
sudo cp /etc/kubernetes/admin.conf ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
```

</v-click>

---

## 노드 압박(pressure)과 축출

```bash
kubectl get pods -A --field-selector status.phase=Failed
kubectl get events -A --field-selector reason=Evicted
kubectl describe node node01 | grep -A5 Conditions
```

<v-clicks>

- **DiskPressure** → kubelet이 **이미지 GC**를 하고, 그래도 부족하면 Pod을 축출한다
- **MemoryPressure** → **QoS 순서**로 축출 (BestEffort → Burstable → Guaranteed)
- 축출된 Pod은 `Failed` 상태로 남는다. 상위 컨트롤러가 새로 만든다

</v-clicks>

<v-click>

```bash
# 노드에서 공간 확보
sudo crictl rmi --prune                       # 안 쓰는 이미지 삭제
sudo journalctl --vacuum-size=200M            # 저널 정리
df -h /var/lib/containerd /var/log

# 축출된 Pod 정리
kubectl delete pods --field-selector status.phase=Failed -A
```

</v-click>

---
class: dense
---

## 종합 시나리오 — 자주 나오는 유형

<v-clicks>

| 문제 | 진단 경로 | 조치 |
|---|---|---|
| 노드 하나가 NotReady | `journalctl -u kubelet` | 스왑/cgroup/서비스 재시작 |
| 앱이 계속 재시작 | `logs --previous` + exit code | limit 상향 또는 command 수정 |
| Service 연결 실패 | `get endpoints` | 라벨 수정 / probe 수정 |
| 이름 해석 실패 | `nslookup kubernetes.default` | CoreDNS 확인 |
| Pod이 계속 Pending | `describe pod` Events | taint/affinity/자원/PVC |
| `kubectl`이 죽었다 | `crictl ps -a` | 매니페스트 복구 |
| 클러스터를 되돌려야 한다 | etcd 스냅샷 | restore + `etcd.yaml` 수정 |
| 특정 사용자만 403 | 에러 메시지 | RoleBinding 추가 |

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 트러블슈팅 문제는 <strong>원인이 하나</strong>다.
여러 개를 동시에 고치려 하지 말고, <strong>층을 좁혀 하나를 찾아</strong> 고친 뒤 검증한다.
</div>

</v-click>

---

## 고치고 나서 반드시 확인할 것

```bash
# 층별 검증
kubectl get nodes                              # 전부 Ready
kubectl get pods -A | grep -vE 'Running|Completed'   # 비정상 Pod 없음
kubectl get events -A --sort-by=.lastTimestamp | tail -20

# 대상 리소스 직접 확인
kubectl rollout status deploy/web
kubectl get endpoints web-svc
kubectl wait --for=condition=ready pod -l app=web --timeout=60s

# 실제로 동작하는지
kubectl run tmp --image=busybox:1.36 --rm -it --restart=Never -- wget -qO- http://web-svc
```

<v-click>

<div class="pitfall">
<strong>함정</strong> — <strong>"YAML을 고쳤다"는 완료가 아니다.</strong>
스태틱 Pod은 다시 뜨는 데 20~60초가 걸리고, 롤아웃은 더 걸린다.
<strong>반드시 최종 상태를 눈으로 확인</strong>하고 다음 문제로 넘어갈 것.
</div>

</v-click>

---

## 18장 요약

<v-clicks>

- 고치기 전에 **층을 확정한다** — `get nodes` / `get nodes` Ready / `get pods -A` 세 줄
- 순서는 **`describe`(Events) → `logs` → `-o yaml`**. 로그부터 보면 안 되는 문제가 많다
- **`logs --previous`** 와 **`get events --sort-by`** 가 두 기둥
- exit code로 좁힌다: **`0`=명령이 끝남, `127`=명령 없음, `137`=OOM/강제종료**
- `Running 0/1` = **readinessProbe 실패** → 엔드포인트에서 빠진다
- **kubectl이 죽으면 `crictl` + `journalctl -u kubelet`**
- 컨트롤 플레인 고장은 **거의 항상 `/etc/kubernetes/manifests/`의 값 하나**
- **kube-proxy가 죽으면 ClusterIP만 죽는다** (Pod 직접 통신은 정상)
- **etcd가 죽으면 API 서버도 못 뜬다** — 순서대로 고친다
- 고친 뒤에는 **반드시 최종 상태를 확인**한다

</v-clicks>
