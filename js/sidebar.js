document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('toggleSidebar');
    const content = document.getElementById('content');

    function expand() {
        sidebar.classList.add('expanded');
        content.classList.remove('collapsed');
    }

    function collapse() {
        sidebar.classList.remove('expanded');
        content.classList.add('collapsed');
    }

    toggle.addEventListener('click', () => {
        if (sidebar.classList.contains('expanded')) collapse();
        else expand();
    });

    sidebar.addEventListener('mouseenter', expand);
    sidebar.addEventListener('mouseleave', collapse);

    // initialize collapsed state
    collapse();
});