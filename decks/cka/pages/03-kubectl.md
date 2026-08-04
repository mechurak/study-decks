---
layout: section
---

# 3. kubectl — 손 속도가 점수다

같은 결과를 30초 만에 만드는 법

---

## kubectl은 무엇인가

<v-clicks>

- API 서버에 **HTTP 요청을 보내는 클라이언트**. 그 이상도 이하도 아니다
- 어디로, 누구로 보낼지는 **kubeconfig**가 정한다
- 기본 경로: **`~/.kube/config`**. `KUBECONFIG` 환경변수나 `--kubeconfig`로 바꾼다

</v-clicks>

<v-click>

```bash
kubectl get pods -v=6      # 실제로 어떤 URL을 호출하는지 보인다
# GET https://10.0.0.1:6443/api/v1/namespaces/default/pods?limit=500 200 OK
```

</v-click>

<v-click>

<div class="pt-2">
이걸 알면 <strong>"권한이 없다"</strong>거나 <strong>"연결이 안 된다"</strong>는 에러를
"어느 주소로 어떤 신원으로 갔는가"로 환원해서 볼 수 있다.
</div>

</v-click>

---

## kubeconfig 구조 — 세 덩어리 + 조합

```yaml
apiVersion: v1
kind: Config
clusters:                    # 어디로: 주소 + CA
  - name: prod
    cluster:
      server: https://10.0.0.1:6443
      certificate-authority: /etc/kubernetes/pki/ca.crt
users:                       # 누구로: 인증 정보
  - name: admin
    user:
      client-certificate: /etc/kubernetes/pki/admin.crt
      client-key: /etc/kubernetes/pki/admin.key
contexts:                    # 조합: cluster + user + namespace
  - name: prod-admin
    context:
      cluster: prod
      user: admin
      namespace: default
current-context: prod-admin  # 지금 쓰는 조합
```

<v-click>

**context = cluster + user + namespace.** 셋을 묶은 것이 컨텍스트다.

</v-click>

---

## 컨텍스트 다루기

```bash
kubectl config get-contexts                    # 목록 (*가 현재)
kubectl config current-context                 # 현재 이름만
kubectl config use-context prod-admin          # 전환
kubectl config set-context --current --namespace=dev   # 현재 컨텍스트의 ns 변경
kubectl config view                            # 전체 보기 (민감정보 마스킹)
kubectl config view --raw                      # 마스킹 없이
```

<v-clicks>

여러 kubeconfig를 합쳐 쓸 수도 있다.

```bash
KUBECONFIG=~/.kube/config:~/other.conf kubectl config view --flatten > merged.conf
```

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 문제마다 컨텍스트 전환 명령이 지문에 주어진다.
<strong>무조건 복사해서 먼저 실행</strong>하고, 불안하면 <code>kubectl config current-context</code>로 확인.
"몇 개의 컨텍스트가 있는가"를 파일에 쓰라는 문제도 실제로 나온다.
</div>

</v-click>

---

## 출력을 다루는 법

```bash
kubectl get pods                          # 기본
kubectl get pods -o wide                  # + IP, 노드, NOMINATED NODE
kubectl get pods -o yaml                  # 전체 오브젝트
kubectl get pods -o json
kubectl get pods --show-labels
kubectl get pods -A                       # 모든 네임스페이스
kubectl get pod,svc,deploy                # 여러 종류 한 번에
kubectl get all                           # 주요 워크로드 리소스 (전부는 아니다)
```

<v-clicks>

<div class="pitfall">
<strong>함정</strong> — <code>kubectl get all</code>은 이름과 달리 <strong>전부가 아니다.</strong>
ConfigMap, Secret, PV, PVC, Ingress, RBAC은 안 나온다. "다 지웠는데 남아 있다"의 원인.
</div>

</v-clicks>

---

## 정렬과 필드 추출

```bash
kubectl get pods --sort-by=.metadata.creationTimestamp
kubectl get nodes --sort-by=.metadata.name
kubectl get events --sort-by=.lastTimestamp
```

<v-clicks>

**jsonpath** — 특정 필드만 뽑는다.

```bash
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.podIP}{"\n"}{end}'
kubectl get node node01 -o jsonpath='{.status.capacity.cpu}'
```

**custom-columns** — 표로 뽑는다. jsonpath보다 읽기 쉽다.

```bash
kubectl get pods -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeName,IMAGE:.spec.containers[0].image'
```

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — "이미지 목록을 파일에 저장하시오" 류는 <strong>custom-columns가 정답</strong>이다.
헤더가 싫으면 <code>--no-headers</code>를 붙인다.
</div>

</v-click>

---

## describe vs get -o yaml

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**`kubectl describe`**

- 사람이 읽으라고 만든 요약
- **끝에 Events가 붙는다** ← 진단의 핵심
- 관련 오브젝트 정보를 합쳐서 보여준다

</div>
<div>

**`kubectl get -o yaml`**

- API가 저장한 **원본 그대로**
- `status` 안의 정확한 값·조건을 본다
- **복사해서 새 오브젝트를 만들 때** 쓴다

</div>
</div>

<v-click>

```bash
kubectl describe pod web              # 왜 안 뜨는가 → Events를 읽는다
kubectl get pod web -o yaml           # 정확히 어떤 값이 들어갔는가
```

</v-click>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 고장난 것을 볼 때는 <strong>거의 항상 <code>describe</code>가 먼저</strong>다.
Events 한 줄에 답이 있는 경우가 대부분이다. (18장)
</div>

</v-click>

---

## 명령형 vs 선언형

<div class="grid grid-cols-2 gap-6 pt-2">
<div>

**명령형 (imperative)**

```bash
kubectl create deploy web --image=nginx
kubectl scale deploy web --replicas=3
kubectl expose deploy web --port=80
```

- **빠르다**
- 표현할 수 있는 것이 제한적

</div>
<div>

**선언형 (declarative)**

```bash
kubectl apply -f web.yaml
```

- 모든 필드를 표현할 수 있다
- 파일을 만들고 편집해야 한다

</div>
</div>

<v-click>

<div class="exam-tip">
<strong>시험 전략</strong> — <strong>명령형으로 뼈대를 만들고, 필요한 것만 YAML로 뽑아 고친다.</strong>
처음부터 빈 파일에 YAML을 치는 것은 <strong>가장 느리고 가장 틀리기 쉬운</strong> 방법이다.
</div>

</v-click>

---

## 생성기(generator) — 시험의 핵심 무기

```bash
# Pod
kubectl run nginx --image=nginx
kubectl run nginx --image=nginx --port=80 --labels=app=web
kubectl run tmp --image=busybox --rm -it --restart=Never -- sh   # 일회용 디버그 셸

# Deployment
kubectl create deploy web --image=nginx --replicas=3

# Service
kubectl expose deploy web --port=80 --target-port=8080 --name=web-svc
kubectl create svc clusterip web-svc --tcp=80:8080

# 그 외
kubectl create ns dev
kubectl create cm app-config --from-literal=KEY=value --from-file=./conf/
kubectl create secret generic db --from-literal=password=s3cr3t
kubectl create sa deploy-bot
kubectl create job hello --image=busybox -- echo hi
kubectl create cronjob hello --image=busybox --schedule="*/1 * * * *" -- echo hi
kubectl create ingress web --rule="example.com/*=web-svc:80"
```

<v-click>

**이 목록을 손에 붙이는 것이 곧 시험 시간이다.** 19장에 전체 치트시트가 있다.

</v-click>

---

## dry-run — 명령형으로 YAML을 뽑는다

```bash
kubectl create deploy web --image=nginx --dry-run=client -o yaml > web.yaml
kubectl run nginx --image=nginx --dry-run=client -o yaml > pod.yaml
kubectl expose deploy web --port=80 --dry-run=client -o yaml > svc.yaml
```

<v-clicks>

- `--dry-run=client` — **클라이언트에서만** 만들고 서버에 안 보낸다. YAML 생성용
- `--dry-run=server` — 서버에 보내되 저장은 안 한다. **admission·검증까지 통과하는지** 본다

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — 시작하자마자 이 두 줄을 만들자.

```bash
export do='--dry-run=client -o yaml'
export now='--force --grace-period=0'
kubectl run nginx --image=nginx $do > pod.yaml
```
</div>

</v-click>

---

## 수정하는 네 가지 방법

```bash
# 1) 전용 서브커맨드 — 가장 빠르다
kubectl scale deploy web --replicas=5
kubectl set image deploy/web nginx=nginx:1.27
kubectl set env deploy/web LOG_LEVEL=debug
kubectl set resources deploy/web --limits=cpu=500m,memory=256Mi
kubectl set serviceaccount deploy/web deploy-bot

# 2) edit — 에디터로 연다
kubectl edit deploy web

# 3) patch — 한 필드만 정확히
kubectl patch deploy web -p '{"spec":{"replicas":5}}'
kubectl patch pod web --type=json -p='[{"op":"replace","path":"/spec/containers/0/image","value":"nginx:1.27"}]'

# 4) apply / replace — 파일 기준
kubectl apply -f web.yaml
kubectl replace -f web.yaml --force      # 지우고 다시 만든다
```

<v-click>

<div class="pitfall">
<strong>함정</strong> — Pod의 <strong>대부분 필드는 수정할 수 없다.</strong>
<code>image</code>, <code>tolerations</code>(추가), <code>activeDeadlineSeconds</code> 정도만 가능하다.
그 외를 고치려면 <code>--force</code>로 지우고 다시 만들어야 한다.
</div>

</v-click>

---

## apply가 하는 일 — 3-way merge

<v-clicks>

- `apply`는 **파일 / 클러스터의 현재 / 마지막으로 적용한 것** 셋을 비교한다
- 그래서 파일에 없는 필드를 **함부로 지우지 않는다** (다른 도구가 넣은 것을 보존)
- 마지막으로 적용한 내용은 애노테이션 `kubectl.kubernetes.io/last-applied-configuration` 에 저장

</v-clicks>

<v-click>

```bash
kubectl diff -f web.yaml        # 적용하면 무엇이 바뀌는지 미리 본다
```

</v-click>

<v-click>

<div class="pitfall">
<strong>함정</strong> — <code>create</code>로 만든 리소스에 <code>apply</code>를 하면
마지막 적용 기록이 없어서 경고가 뜬다. 시험에서는 무해하지만,
<strong><code>replace</code>는 3-way merge를 안 한다</strong>는 것은 알아둘 것 — 파일에 없는 필드가 사라진다.
</div>

</v-click>

---

## 삭제

```bash
kubectl delete pod web
kubectl delete -f web.yaml
kubectl delete pod -l app=web              # 라벨로
kubectl delete pods --all -n dev
kubectl delete pod web --force --grace-period=0   # 즉시 (graceful 생략)
kubectl delete deploy web --cascade=orphan        # 자식(Pod)을 남긴다
```

<v-clicks>

- 기본 삭제는 **graceful**이다 — `terminationGracePeriodSeconds`(기본 30초)를 기다린다
- 시험에서 Pod을 지우고 다시 만들 일이 많으니 `--force --grace-period=0`이 유용하다

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — Deployment가 관리하는 Pod을 지우면 <strong>즉시 다시 생긴다.</strong>
"Pod을 지웠는데 계속 있다"면 상위 컨트롤러를 지워야 한다.
반대로 <strong>네임스페이스가 <code>Terminating</code>에서 안 끝나면</strong> finalizer를 의심한다.
</div>

</v-click>

---

## 로그 — 커리큘럼의 "컨테이너 출력 스트림"

```bash
kubectl logs web
kubectl logs web -c sidecar                # 멀티 컨테이너면 -c 필수
kubectl logs web --previous                # 죽기 직전 컨테이너의 로그  ★
kubectl logs web -f                        # 따라가기
kubectl logs web --tail=50
kubectl logs web --since=10m
kubectl logs web --timestamps
kubectl logs -l app=web --all-containers --prefix     # 라벨로 여러 Pod 한 번에
kubectl logs deploy/web                    # 컨트롤러를 지정해도 된다
```

<v-click>

<div class="exam-tip">
<strong>시험</strong> — <strong><code>--previous</code>가 CrashLoopBackOff 진단의 핵심</strong>이다.
지금 컨테이너는 아직 시작 중이라 로그가 비어 있고, 죽은 이전 컨테이너에 이유가 있다.
</div>

</v-click>

<v-click>

<div class="pt-1 text-sm opacity-80">
로그의 실체는 노드의 <code>/var/log/pods/&lt;ns&gt;_&lt;pod&gt;_&lt;uid&gt;/&lt;container&gt;/*.log</code> 다.
API 서버가 죽어 <code>kubectl logs</code>가 안 될 때 직접 읽는다.
</div>

</v-click>

---

## exec · cp · port-forward

```bash
kubectl exec web -- ls /app
kubectl exec -it web -- sh                 # 대화형
kubectl exec -it web -c sidecar -- sh

kubectl cp ./local.txt web:/tmp/local.txt
kubectl cp web:/var/log/app.log ./app.log

kubectl port-forward pod/web 8080:80       # 로컬 8080 → Pod 80
kubectl port-forward svc/web-svc 8080:80
```

<v-clicks>

**임시 디버그 Pod** — 클러스터 안에서 네트워크를 확인할 때.

```bash
kubectl run tmp --image=busybox:1.36 --rm -it --restart=Never -- sh
# 안에서: wget -qO- http://web-svc.default.svc.cluster.local
#         nslookup web-svc
```

</v-clicks>

<v-click>

<div class="pitfall">
<strong>함정</strong> — 배포용 이미지에는 <code>sh</code>조차 없는 경우가 많다(distroless).
그럴 땐 <code>kubectl debug -it web --image=busybox --target=web</code> 로
<strong>임시 컨테이너(ephemeral container)</strong>를 붙인다.
</div>

</v-click>

---

## 이벤트 — 시간순으로 보는 클러스터의 일기

```bash
kubectl get events --sort-by=.lastTimestamp
kubectl get events -A --sort-by=.lastTimestamp | tail -30
kubectl get events --field-selector type=Warning
kubectl get events --field-selector involvedObject.name=web
kubectl events --for pod/web              # 새 전용 명령
```

<v-clicks>

- 이벤트는 **기본 1시간 후 사라진다.** 오래된 문제는 이벤트로 못 잡는다
- `describe`의 아래쪽 Events 섹션이 사실 이것이다

</v-clicks>

<v-click>

<div class="exam-tip">
<strong>시험</strong> — "왜 안 뜨는가" 문제는
<strong><code>describe</code> → Events</strong> 또는 <strong><code>get events --sort-by</code></strong> 로 90%가 풀린다.
로그보다 이벤트가 먼저인 경우가 많다 (스케줄링·이미지·볼륨 문제는 로그에 안 나온다).
</div>

</v-click>

---

## 3장 요약

<v-clicks>

- kubectl은 **kubeconfig로 결정된 주소·신원**으로 API를 호출하는 클라이언트다
- **context = cluster + user + namespace.** 시험은 컨텍스트 전환에서 갈린다
- **명령형으로 만들고 `--dry-run=client -o yaml`로 뽑아 고친다** — 이게 가장 빠르다
- 조회는 `-o wide` → `describe`(Events) → `-o yaml` 순으로 좁혀 간다
- **`--sort-by`, `custom-columns`, `jsonpath`** 는 "파일에 저장하시오" 문제 전용 무기
- **`logs --previous`** 와 **`get events --sort-by`** 는 진단의 두 기둥
- Pod은 대부분 필드를 못 고친다 → `--force`로 다시 만든다

</v-clicks>
