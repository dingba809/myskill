# VyOS 1.5 配置基础与工作流

VyOS 命令行界面（CLI）分为两种主要模式：**操作模式 (Operational Mode)** 和 **配置模式 (Configuration Mode)**。

## 1. 模式切换

*   **进入配置模式**：在操作模式下输入 `configure`，提示符会从 `$` 变为 `#`。
    ```text
    vyos@vyos:~$ configure
    [edit]
    vyos@vyos:#
    ```
*   **退出配置模式**：在配置模式下输入 `exit`。如果存在未提交的修改，系统会予以警告。

## 2. 核心配置操作 (Configuration Commands)

在配置模式下，主要通过以下命令操作配置树：

*   **`set`**：创建或修改配置节点。
    ```text
    set system host-name 'vyos-router'
    ```
*   **`delete`**：删除配置节点或其属性。
    ```text
    delete system host-name
    ```
*   **`show`**：查看当前配置节点（包含未提交的修改）。
    *   在配置模式下输入 `show` 查看整个配置树。
    *   可以通过路径限定范围，例如 `show system`。
    *   可以使用 `show | commands` 以 `set` 命令流形式展示当前配置。

## 3. 提交与保存工作流 (Commit & Save)

在 VyOS 中，修改配置是“两阶段提交”的：

1.  **修改**：使用 `set` / `delete` 进行修改（这些修改保存在临时的工作配置（Working Configuration）中，尚未生效）。
2.  **提交 (`commit`)**：使工作配置在运行中生效（变为活动配置 Active Configuration）。
    *   如果提交失败，配置会自动回滚。
    *   `commit-confirm <minutes>`：提交并在指定分钟后需要确认（运行模式下输入 `confirm`），否则自动重启回滚。这对于远程配置防失联非常重要。
3.  **保存 (`save`)**：将当前活动配置持久化保存到 `/config/config.boot`，保证重启后不丢失。
4.  **放弃 (`discard`)**：放弃当前所有未提交的修改。

## 4. 比较配置变化

*   **`compare`**：在 commit 之前，比较工作配置与当前活动配置之间的差异。
    ```text
    vyos@vyos:# compare
    [edit system]
    >host-name "vyos-router"
    ```

## 5. 配置命令的层级树与快捷键

*   **`TAB`** 键：自动补全命令，双击展示可选的子命令。
*   **`?`** 键：显示当前命令位置下的所有帮助提示。
*   **`show | commands`**：对于从现有路由器导出配置极为有用，输出结果可以直接用于在另一台 VyOS 上进行粘贴。
