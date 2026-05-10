import java.awt.BasicStroke;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.GridLayout;
import java.awt.Insets;
import java.awt.RenderingHints;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.DefaultListCellRenderer;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingConstants;
import javax.swing.SwingUtilities;
import javax.swing.Timer;
import javax.swing.UIManager;
import javax.swing.border.EmptyBorder;
import javax.swing.plaf.basic.BasicComboBoxUI;
import javax.swing.table.DefaultTableCellRenderer;
import javax.swing.table.DefaultTableModel;
import javax.swing.table.JTableHeader;

public class KitchenOrdersApp extends JFrame {
  private static final String BASE_URL = apiBaseUrl();
  private static final Color BG = new Color(11, 17, 23);
  private static final Color PANEL = new Color(14, 22, 30);
  private static final Color PANEL_2 = new Color(20, 31, 42);
  private static final Color PANEL_3 = new Color(27, 41, 54);
  private static final Color PANEL_DEEP = new Color(8, 13, 18);
  private static final Color LINE = new Color(255, 255, 255, 34);
  private static final Color TEXT = new Color(247, 250, 247);
  private static final Color MUTED = new Color(157, 171, 184);
  private static final Color ORANGE = new Color(255, 122, 26);
  private static final Color GREEN = new Color(46, 204, 113);
  private static final Color RED = new Color(255, 77, 79);
  private static final Font UI_FONT = new Font("Segoe UI", Font.BOLD, 14);
  private static final Font UI_FONT_PLAIN = new Font("Segoe UI", Font.PLAIN, 14);
  private static final Font MONO_FONT = new Font("Consolas", Font.PLAIN, 15);

  private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
  private final DefaultTableModel model = new DefaultTableModel(new String[] {"ID", "Код", "Ім'я", "Тип", "Статус", "Сума", "Час"}, 0) {
    @Override public boolean isCellEditable(int row, int column) { return false; }
  };
  private final JTable table = new JTable(model);
  private final JTextArea details = new JTextArea();
  private final JLabel statusLine = new JLabel("Підключення...");
  private final StatCard newCount = new StatCard("0", "Нові", ORANGE);
  private final StatCard acceptedCount = new StatCard("0", "Прийняті", GREEN);
  private final StatCard issuedCount = new StatCard("0", "Видані", GREEN);
  private final StatCard canceledCount = new StatCard("0", "Скасовані", RED);
  private final JComboBox<String> filter = new JComboBox<>(new String[] {"Усі", "Нові", "Прийняті", "Видані", "Скасовані"});
  private final JTextField search = new JTextField();
  private final List<OrderRow> allOrders = new ArrayList<>();
  private final List<OrderRow> visibleOrders = new ArrayList<>();
  private final JTextField reportDate = new JTextField(LocalDate.now().toString());
  private final JTextArea reportArea = new JTextArea();
  private final StatCard reportOrders = new StatCard("0", "Замовлень", ORANGE);
  private final StatCard reportItems = new StatCard("0", "Продано", GREEN);
  private final StatCard reportRevenue = new StatCard("0", "Гривень", ORANGE);
  private int hoveredRow = -1;

  private static String apiBaseUrl() {
    String fromProperty = System.getProperty("kavabanga.api");
    String fromEnv = System.getenv("KAVABANGA_API_BASE");
    String raw = fromProperty != null && !fromProperty.isBlank() ? fromProperty : fromEnv;
    if (raw == null || raw.isBlank()) raw = "http://127.0.0.1:5000";
    return raw.replaceAll("/+$", "");
  }

  public KitchenOrdersApp() {
    super("Pizza Kavabanga - кухня");
    setDefaultCloseOperation(EXIT_ON_CLOSE);
    setMinimumSize(new Dimension(1180, 720));
    setLocationByPlatform(true);
    buildUi();
    refreshOrders();
    refreshReport();
    new Timer(3000, event -> refreshOrders()).start();
    new Timer(15000, event -> {
      if (LocalDate.now().toString().equals(reportDate.getText().trim())) refreshReport();
    }).start();
  }

  private void buildUi() {
    GradientRoot root = new GradientRoot();
    root.setLayout(new BorderLayout(18, 18));
    root.setBorder(new EmptyBorder(18, 20, 18, 20));
    setContentPane(root);
    root.add(buildHeader(), BorderLayout.NORTH);
    root.add(buildTabs(), BorderLayout.CENTER);
    root.add(buildFooter(), BorderLayout.SOUTH);
  }

  private JPanel buildHeader() {
    RoundedPanel header = new RoundedPanel(new BorderLayout(22, 12), 24, PANEL);
    header.setBorder(new EmptyBorder(22, 24, 22, 24));

    JLabel brand = label("PIZZA COMMAND CENTER", 12, Font.BOLD, GREEN);
    JLabel title = label("KAVABANGA KITCHEN", 34, Font.BOLD, TEXT);
    JLabel subtitle = label("Жива панель замовлень: приймай, скасовуй, прибирай виконане і тримай кухню в темпі.", 14, Font.BOLD, MUTED);

    RoundedPanel logo = new RoundedPanel(new GridBagLayout(), 18, PANEL_2);
    logo.setPreferredSize(new Dimension(68, 68));
    logo.setBorder(new EmptyBorder(8, 8, 8, 8));
    JLabel logoText = label("KV", 22, Font.BOLD, ORANGE);
    logo.add(logoText);

    JPanel titleStack = transparent();
    titleStack.setLayout(new BoxLayout(titleStack, BoxLayout.Y_AXIS));
    titleStack.add(brand);
    titleStack.add(Box.createVerticalStrut(4));
    titleStack.add(title);
    titleStack.add(Box.createVerticalStrut(7));
    titleStack.add(subtitle);

    JPanel titleBox = transparent(new BorderLayout(16, 0));
    titleBox.add(logo, BorderLayout.WEST);
    titleBox.add(titleStack, BorderLayout.CENTER);

    JPanel stats = new JPanel(new GridLayout(1, 4, 12, 0));
    stats.setOpaque(false);
    stats.add(newCount);
    stats.add(acceptedCount);
    stats.add(issuedCount);
    stats.add(canceledCount);

    RoundedButton refresh = new RoundedButton("Оновити", GREEN, Color.BLACK);
    refresh.setPreferredSize(new Dimension(126, 54));
    refresh.addActionListener(event -> refreshOrders());

    JPanel right = transparent(new BorderLayout(12, 0));
    right.add(stats, BorderLayout.CENTER);
    right.add(refresh, BorderLayout.EAST);

    header.add(titleBox, BorderLayout.CENTER);
    header.add(right, BorderLayout.EAST);
    return header;
  }

  private JTabbedPane buildTabs() {
    JTabbedPane tabs = new JTabbedPane();
    tabs.setFont(new Font("Segoe UI", Font.BOLD, 14));
    tabs.setBackground(PANEL_DEEP);
    tabs.setForeground(TEXT);
    tabs.addTab("Замовлення", buildMain());
    tabs.addTab("Звітність", buildReports());
    tabs.setTabComponentAt(0, tabLabel("Замовлення"));
    tabs.setTabComponentAt(1, tabLabel("Звітність"));
    tabs.addChangeListener(event -> updateTabLabels(tabs));
    updateTabLabels(tabs);
    return tabs;
  }

  private JLabel tabLabel(String text) {
    JLabel label = new JLabel(text, SwingConstants.CENTER);
    label.setOpaque(true);
    label.setFont(new Font("Segoe UI", Font.BOLD, 14));
    label.setBorder(new EmptyBorder(10, 18, 10, 18));
    return label;
  }

  private void updateTabLabels(JTabbedPane tabs) {
    for (int i = 0; i < tabs.getTabCount(); i++) {
      Component component = tabs.getTabComponentAt(i);
      if (!(component instanceof JLabel label)) continue;
      boolean selected = i == tabs.getSelectedIndex();
      label.setForeground(selected ? Color.BLACK : TEXT);
      label.setBackground(selected ? GREEN : PANEL_2);
      label.setBorder(BorderFactory.createCompoundBorder(
          BorderFactory.createLineBorder(selected ? GREEN : new Color(255, 255, 255, 34)),
          new EmptyBorder(10, 18, 10, 18)
      ));
    }
  }

  private JPanel buildMain() {
    styleTable();
    table.getSelectionModel().addListSelectionListener(event -> showSelectedDetails());

    JScrollPane tablePane = new JScrollPane(table);
    tablePane.setBorder(BorderFactory.createEmptyBorder());
    tablePane.getViewport().setBackground(PANEL);
    tablePane.setOpaque(false);

    details.setEditable(false);
    details.setLineWrap(true);
    details.setWrapStyleWord(true);
    details.setForeground(TEXT);
    details.setBackground(PANEL_DEEP);
    details.setFont(MONO_FONT);
    details.setMargin(new Insets(18, 18, 18, 18));
    details.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(46, 204, 113, 80)), new EmptyBorder(18, 18, 18, 18)));
    JScrollPane detailsPane = new JScrollPane(details);
    detailsPane.setBorder(BorderFactory.createEmptyBorder());
    detailsPane.getViewport().setBackground(PANEL_DEEP);
    detailsPane.setOpaque(false);

    RoundedPanel left = new RoundedPanel(new BorderLayout(14, 14), 22, PANEL);
    left.setBorder(new EmptyBorder(16, 16, 16, 16));
    left.add(buildFilters(), BorderLayout.NORTH);
    left.add(tablePane, BorderLayout.CENTER);

    RoundedPanel right = new RoundedPanel(new BorderLayout(14, 14), 22, PANEL);
    right.setBorder(new EmptyBorder(16, 16, 16, 16));
    right.add(label("Деталі замовлення", 21, Font.BOLD, TEXT), BorderLayout.NORTH);
    right.add(detailsPane, BorderLayout.CENTER);

    JPanel main = new JPanel(new GridLayout(1, 2, 16, 0));
    main.setOpaque(false);
    main.add(left);
    main.add(right);
    return main;
  }

  private JPanel buildReports() {
    RoundedPanel panel = new RoundedPanel(new BorderLayout(14, 14), 22, PANEL);
    panel.setBorder(new EmptyBorder(16, 16, 16, 16));

    JPanel top = transparent(new BorderLayout(14, 0));
    JPanel controls = transparent(new FlowLayout(FlowLayout.LEFT, 10, 0));
    JLabel label = label("Дата", 13, Font.BOLD, GREEN);
    reportDate.setPreferredSize(new Dimension(150, 44));
    reportDate.setBackground(PANEL_2);
    reportDate.setForeground(TEXT);
    reportDate.setCaretColor(GREEN);
    reportDate.setFont(UI_FONT);
    reportDate.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(46, 204, 113, 70)), new EmptyBorder(10, 12, 10, 12)));
    RoundedButton today = new RoundedButton("Сьогодні", GREEN, Color.BLACK);
    RoundedButton yesterday = new RoundedButton("Вчора", new Color(130, 142, 156), Color.WHITE);
    RoundedButton refresh = new RoundedButton("Оновити", ORANGE, Color.BLACK);
    today.setPreferredSize(new Dimension(118, 44));
    yesterday.setPreferredSize(new Dimension(100, 44));
    refresh.setPreferredSize(new Dimension(118, 44));
    today.addActionListener(event -> {
      reportDate.setText(LocalDate.now().toString());
      refreshReport();
    });
    yesterday.addActionListener(event -> {
      reportDate.setText(LocalDate.now().minusDays(1).toString());
      refreshReport();
    });
    refresh.addActionListener(event -> refreshReport());
    controls.add(label);
    controls.add(reportDate);
    controls.add(today);
    controls.add(yesterday);
    controls.add(refresh);

    JPanel stats = new JPanel(new GridLayout(1, 3, 12, 0));
    stats.setOpaque(false);
    stats.add(reportOrders);
    stats.add(reportItems);
    stats.add(reportRevenue);

    top.add(controls, BorderLayout.WEST);
    top.add(stats, BorderLayout.EAST);

    reportArea.setEditable(false);
    reportArea.setLineWrap(true);
    reportArea.setWrapStyleWord(true);
    reportArea.setForeground(TEXT);
    reportArea.setBackground(PANEL_DEEP);
    reportArea.setFont(MONO_FONT);
    reportArea.setMargin(new Insets(18, 18, 18, 18));
    reportArea.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(255, 122, 26, 70)), new EmptyBorder(14, 14, 14, 14)));
    JScrollPane reportPane = new JScrollPane(reportArea);
    reportPane.setBorder(BorderFactory.createEmptyBorder());
    reportPane.getViewport().setBackground(PANEL_DEEP);

    panel.add(top, BorderLayout.NORTH);
    panel.add(reportPane, BorderLayout.CENTER);
    return panel;
  }

  private JPanel buildFilters() {
    JPanel panel = transparent(new GridBagLayout());
    panel.setBorder(new EmptyBorder(2, 0, 2, 0));
    GridBagConstraints c = new GridBagConstraints();
    c.insets = new Insets(0, 0, 0, 10);
    c.gridy = 0;
    c.gridx = 0;
    c.anchor = GridBagConstraints.WEST;
    JLabel filterLabel = label("Фільтр", 13, Font.BOLD, GREEN);
    panel.add(filterLabel, c);

    c.gridx = 1;
    styleFilterCombo();
    filter.addActionListener(event -> applyFilter());
    panel.add(filter, c);

    c.gridx = 2;
    c.weightx = 1;
    c.fill = GridBagConstraints.HORIZONTAL;
    search.setBackground(PANEL_2);
    search.setForeground(TEXT);
    search.setCaretColor(GREEN);
    search.setFont(UI_FONT);
    search.setPreferredSize(new Dimension(360, 44));
    search.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(46, 204, 113, 70)), new EmptyBorder(11, 14, 11, 14)));
    search.putClientProperty("JTextField.placeholderText", "Пошук за кодом або ім'ям");
    search.getDocument().addDocumentListener((SimpleDocumentListener) e -> applyFilter());
    panel.add(search, c);
    return panel;
  }

  private void styleFilterCombo() {
    filter.setBackground(PANEL_2);
    filter.setForeground(TEXT);
    filter.setFont(UI_FONT);
    filter.setPreferredSize(new Dimension(172, 44));
    filter.setMaximumRowCount(8);
    filter.setFocusable(false);
    filter.setOpaque(false);
    filter.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(49, 210, 111, 82)), new EmptyBorder(2, 8, 2, 8)));
    filter.setRenderer(new FilterRenderer());
    filter.setUI(new DarkComboBoxUI());
  }

  private JPanel buildFooter() {
    RoundedPanel footer = new RoundedPanel(new BorderLayout(14, 10), 22, PANEL);
    footer.setBorder(new EmptyBorder(14, 18, 14, 18));
    statusLine.setForeground(new Color(205, 216, 224));
    statusLine.setFont(new Font("Segoe UI", Font.BOLD, 13));

    RoundedButton accept = new RoundedButton("Прийняти", ORANGE, Color.BLACK);
    RoundedButton issued = new RoundedButton("Видано", GREEN, Color.BLACK);
    RoundedButton cancel = new RoundedButton("Скасувати", RED, Color.WHITE);
    RoundedButton delete = new RoundedButton("Видалити завершене", new Color(130, 142, 156), Color.WHITE);
    accept.setPreferredSize(new Dimension(128, 50));
    issued.setPreferredSize(new Dimension(116, 50));
    cancel.setPreferredSize(new Dimension(128, 50));
    delete.setPreferredSize(new Dimension(190, 50));
    accept.addActionListener(event -> postSelected("accept"));
    issued.addActionListener(event -> postSelected("issued"));
    cancel.addActionListener(event -> postSelected("cancel"));
    delete.addActionListener(event -> deleteSelected());

    JPanel actions = transparent(new FlowLayout(FlowLayout.RIGHT, 10, 0));
    actions.add(accept);
    actions.add(issued);
    actions.add(cancel);
    actions.add(delete);

    footer.add(statusLine, BorderLayout.CENTER);
    footer.add(actions, BorderLayout.EAST);
    return footer;
  }

  private JLabel label(String text, int size, int weight, Color color) {
    JLabel label = new JLabel(text);
    label.setForeground(color);
    label.setFont(new Font("Segoe UI", weight, size));
    return label;
  }

  private JPanel transparent() {
    JPanel panel = new JPanel();
    panel.setOpaque(false);
    return panel;
  }

  private JPanel transparent(java.awt.LayoutManager layout) {
    JPanel panel = new JPanel(layout);
    panel.setOpaque(false);
    return panel;
  }

  private void styleTable() {
    table.setBackground(PANEL_DEEP);
    table.setForeground(TEXT);
    table.setGridColor(new Color(255, 255, 255, 0));
    table.setRowHeight(58);
    table.setFont(UI_FONT);
    table.setShowVerticalLines(false);
    table.setShowHorizontalLines(false);
    table.setIntercellSpacing(new Dimension(0, 8));
    table.setFillsViewportHeight(true);
    table.setSelectionBackground(new Color(255, 122, 26, 92));
    table.setSelectionForeground(TEXT);
    JTableHeader header = table.getTableHeader();
    header.setBackground(PANEL_2);
    header.setForeground(GREEN);
    header.setFont(new Font("Segoe UI", Font.BOLD, 13));
    header.setPreferredSize(new Dimension(header.getPreferredSize().width, 44));
    header.setBorder(BorderFactory.createEmptyBorder());
    table.setSelectionBackground(new Color(255, 122, 24, 90));
    table.setSelectionForeground(TEXT);
    table.getColumnModel().getColumn(0).setPreferredWidth(58);
    table.getColumnModel().getColumn(1).setPreferredWidth(100);
    table.getColumnModel().getColumn(2).setPreferredWidth(180);
    table.getColumnModel().getColumn(3).setPreferredWidth(150);
    table.getColumnModel().getColumn(4).setPreferredWidth(110);
    table.getColumnModel().getColumn(5).setPreferredWidth(110);
    table.getColumnModel().getColumn(6).setPreferredWidth(190);
    table.addMouseMotionListener(new MouseAdapter() {
      @Override public void mouseMoved(MouseEvent event) {
        int row = table.rowAtPoint(event.getPoint());
        if (row != hoveredRow) {
          hoveredRow = row;
          table.repaint();
        }
      }
    });
    table.addMouseListener(new MouseAdapter() {
      @Override public void mouseExited(MouseEvent event) {
        hoveredRow = -1;
        table.repaint();
      }
    });
    table.setDefaultRenderer(Object.class, new OrderTableRenderer());
  }

  private Color statusColor(String status) {
    if (status.contains("Скас")) return RED;
    if (status.contains("Видан")) return GREEN;
    if (status.contains("Прий")) return GREEN;
    return ORANGE;
  }

  private Color statusBackground(String status) {
    if (status.contains("Скас")) return new Color(255, 77, 79, 42);
    if (status.contains("Видан")) return new Color(46, 204, 113, 56);
    if (status.contains("Прий")) return new Color(46, 204, 113, 42);
    return new Color(255, 122, 26, 46);
  }

  private void refreshOrders() {
    new Thread(() -> {
      try {
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + "/kitchen/orders.tsv")).timeout(Duration.ofSeconds(5)).GET().build();
        String body = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
        List<OrderRow> next = parseOrders(body);
        SwingUtilities.invokeLater(() -> {
          allOrders.clear();
          allOrders.addAll(next);
          applyFilter();
          updateStats();
          statusLine.setText("Підключено до " + BASE_URL + " | Замовлень: " + allOrders.size() + " | Автооновлення кожні 3 сек");
        });
      } catch (Exception ex) {
        SwingUtilities.invokeLater(() -> statusLine.setText("Сервер замовлень недоступний: перевір " + BASE_URL));
      }
    }, "orders-refresh").start();
  }

  private void refreshReport() {
    String date = reportDate.getText().trim();
    if (!date.matches("\\d{4}-\\d{2}-\\d{2}")) {
      reportArea.setText("Введи дату у форматі YYYY-MM-DD, наприклад " + LocalDate.now() + ".");
      return;
    }
    new Thread(() -> {
      try {
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + "/kitchen/report.tsv?date=" + date)).timeout(Duration.ofSeconds(5)).GET().build();
        String body = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)).body();
        SwingUtilities.invokeLater(() -> parseReport(date, body));
      } catch (Exception ex) {
        SwingUtilities.invokeLater(() -> reportArea.setText("Не вдалося завантажити звітність: перевір " + BASE_URL));
      }
    }, "report-refresh").start();
  }

  private void parseReport(String date, String body) {
    int orders = 0;
    int items = 0;
    int revenue = 0;
    StringBuilder text = new StringBuilder();
    text.append("ЗВІТ ЗА ").append(date).append("\n\n");
    text.append("Продані позиції\n");
    text.append("────────────────────────────────────────\n");

    String[] lines = body.split("\\R");
    for (int i = 1; i < lines.length; i++) {
      if (lines[i].isBlank()) continue;
      String[] p = lines[i].split("\\t", -1);
      if (p.length < 4) continue;
      if (p[0].equals("summary") && p[1].equals("orders")) {
        orders = parseInt(p[2]);
        revenue = parseInt(p[3]);
      } else if (p[0].equals("summary") && p[1].equals("items")) {
        items = parseInt(p[2]);
      } else if (p[0].equals("product")) {
        text.append("• ").append(p[1]).append(" — ").append(p[2]).append(" шт. / ").append(p[3]).append(" грн\n");
      }
    }

    if (!text.toString().contains("• ")) text.append("За цю дату ще немає продажів.\n");
    text.append("\nПідсумок: ").append(orders).append(" замовлень, ").append(items).append(" товарів, ").append(revenue).append(" грн.");

    reportOrders.setValues(String.valueOf(orders), "Замовлень");
    reportItems.setValues(String.valueOf(items), "Продано");
    reportRevenue.setValues(String.valueOf(revenue), "Гривень");
    reportArea.setText(text.toString());
    reportArea.setCaretPosition(0);
  }

  private int parseInt(String raw) {
    try {
      return Integer.parseInt(String.valueOf(raw).trim());
    } catch (NumberFormatException ex) {
      return 0;
    }
  }

  private List<OrderRow> parseOrders(String body) {
    List<OrderRow> rows = new ArrayList<>();
    String[] lines = body.split("\\R");
    for (int i = 1; i < lines.length; i++) {
      if (lines[i].isBlank()) continue;
      String[] p = lines[i].split("\\t", -1);
      if (p.length >= 9) rows.add(new OrderRow(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8]));
      else if (p.length >= 7) rows.add(new OrderRow(p[0], p[1], p[2], "Самовивіз", "", p[3], p[4], p[5], p[6]));
    }
    return rows;
  }

  private void applyFilter() {
    String selected = String.valueOf(filter.getSelectedItem());
    String q = search.getText().trim().toLowerCase(Locale.ROOT);
    visibleOrders.clear();
    for (OrderRow row : allOrders) {
      boolean statusOk = selected.equals("Усі")
          || (selected.equals("Нові") && row.status.equals("Нове"))
          || (selected.equals("Прийняті") && row.status.contains("Прий"))
          || (selected.equals("Видані") && row.status.contains("Видан"))
          || (selected.equals("Скасовані") && row.status.contains("Скас"));
      boolean searchOk = q.isEmpty()
          || row.code.toLowerCase(Locale.ROOT).contains(q)
          || row.customer.toLowerCase(Locale.ROOT).contains(q)
          || row.method.toLowerCase(Locale.ROOT).contains(q)
          || row.address.toLowerCase(Locale.ROOT).contains(q)
          || row.items.toLowerCase(Locale.ROOT).contains(q);
      if (statusOk && searchOk) visibleOrders.add(row);
    }
    model.setRowCount(0);
    for (OrderRow row : visibleOrders) {
      model.addRow(new Object[] {row.id, row.code, row.customer, row.method, row.status, row.total + " грн", shortTime(row.created)});
    }
    if (!visibleOrders.isEmpty()) table.setRowSelectionInterval(0, 0);
    else details.setText("Немає замовлень за цим фільтром.\n\nСпробуй змінити статус або очистити пошук.");
  }

  private String shortTime(String value) {
    if (value == null) return "";
    return value.replace("T", " ").replace("Z", "");
  }

  private void updateStats() {
    int fresh = 0;
    int accepted = 0;
    int issued = 0;
    int canceled = 0;
    for (OrderRow row : allOrders) {
      if (row.status.equals("Нове")) fresh++;
      else if (row.status.contains("Видан")) issued++;
      else if (row.status.contains("Прий")) accepted++;
      else if (row.status.contains("Скас")) canceled++;
    }
    newCount.setValues(String.valueOf(fresh), "Нові");
    acceptedCount.setValues(String.valueOf(accepted), "Прийняті");
    issuedCount.setValues(String.valueOf(issued), "Видані");
    canceledCount.setValues(String.valueOf(canceled), "Скасовані");
  }

  private OrderRow selectedOrder() {
    int viewRow = table.getSelectedRow();
    if (viewRow < 0) return null;
    int row = table.convertRowIndexToModel(viewRow);
    return row >= 0 && row < visibleOrders.size() ? visibleOrders.get(row) : null;
  }

  private void showSelectedDetails() {
    OrderRow order = selectedOrder();
    if (order == null) return;
    String items = order.items.isBlank() ? "  - склад не вказано" : "  - " + order.items.replace(", ", "\n  - ");
    details.setText(
        "┌──────────────────────────────────────┐\n" +
        "│        PIZZA KAVABANGA KITCHEN       │\n" +
        "└──────────────────────────────────────┘\n\n" +
        "ORDER      #" + order.code + "\n" +
        "CUSTOMER   " + order.customer + "\n" +
        "TYPE       " + order.method + "\n" +
        (order.address.isBlank() ? "" : "ADDRESS    " + order.address + "\n") +
        "STATUS     " + order.status + "\n" +
        "TOTAL      " + order.total + " грн\n" +
        "TIME       " + shortTime(order.created) + "\n\n" +
        "RECEIPT\n" +
        BASE_URL + "/receipt/" + order.code + "\n\n" +
        "ITEMS\n" + items + "\n\n" +
        "────────────────────────────────────────\n" +
        "Покажи код на видачі або відкрий чек."
    );
  }

  private void postSelected(String action) {
    OrderRow order = selectedOrder();
    if (order == null) {
      JOptionPane.showMessageDialog(this, "Обери замовлення в таблиці.");
      return;
    }
    post("/kitchen/orders/" + order.id + "/" + action, "Не вдалося виконати дію.");
  }

  private void deleteSelected() {
    OrderRow order = selectedOrder();
    if (order == null) {
      JOptionPane.showMessageDialog(this, "Обери замовлення в таблиці.");
      return;
    }
    if (order.status.equals("Нове")) {
      JOptionPane.showMessageDialog(this, "Нове замовлення спочатку прийми або скасуй.");
      return;
    }
    int ok = JOptionPane.showConfirmDialog(this, "Видалити замовлення " + order.code + "?", "Підтвердження", JOptionPane.YES_NO_OPTION);
    if (ok == JOptionPane.YES_OPTION) post("/kitchen/orders/" + order.id + "/delete", "Не вдалося видалити замовлення.");
  }

  private void post(String path, String errorText) {
    new Thread(() -> {
      try {
        HttpRequest request = HttpRequest.newBuilder(URI.create(BASE_URL + path))
            .timeout(Duration.ofSeconds(5))
            .POST(HttpRequest.BodyPublishers.noBody())
            .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
          throw new IOException("HTTP " + response.statusCode());
        }
        SwingUtilities.invokeLater(this::refreshOrders);
      } catch (IOException | InterruptedException ex) {
        SwingUtilities.invokeLater(() -> JOptionPane.showMessageDialog(this, errorText + "\n\n" + ex.getMessage() + "\nПерезапусти сервер замовлень, якщо кнопку додано щойно."));
      }
    }, "order-action").start();
  }

  public static void main(String[] args) {
    SwingUtilities.invokeLater(() -> {
      try {
        UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
      } catch (Exception ignored) {}
      UIManager.put("ComboBox.selectionBackground", ORANGE);
      UIManager.put("ComboBox.selectionForeground", Color.BLACK);
      UIManager.put("ComboBox.background", PANEL_2);
      UIManager.put("ComboBox.foreground", TEXT);
      new KitchenOrdersApp().setVisible(true);
    });
  }

  private record OrderRow(String id, String code, String customer, String method, String address, String status, String total, String created, String items) {}

  @FunctionalInterface
  private interface SimpleDocumentListener extends javax.swing.event.DocumentListener {
    void update(javax.swing.event.DocumentEvent event);
    @Override default void insertUpdate(javax.swing.event.DocumentEvent event) { update(event); }
    @Override default void removeUpdate(javax.swing.event.DocumentEvent event) { update(event); }
    @Override default void changedUpdate(javax.swing.event.DocumentEvent event) { update(event); }
  }

  private static final class GradientRoot extends JPanel {
    @Override protected void paintComponent(Graphics g) {
      super.paintComponent(g);
      Graphics2D g2 = (Graphics2D) g.create();
      g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g2.setColor(BG);
      g2.fillRect(0, 0, getWidth(), getHeight());
      g2.setColor(new Color(46, 204, 113, 28));
      g2.fillOval(-220, -190, 620, 480);
      g2.setColor(new Color(255, 122, 26, 36));
      g2.fillOval(getWidth() - 520, -210, 650, 520);
      g2.setColor(new Color(255, 255, 255, 9));
      for (int y = 0; y < getHeight(); y += 36) {
        g2.drawLine(0, y, getWidth(), y);
      }
      g2.dispose();
    }
  }

  private static class RoundedPanel extends JPanel {
    private final int radius;
    private final Color fill;
    private final Color stroke;
    RoundedPanel(java.awt.LayoutManager layout, int radius, Color fill) {
      super(layout);
      this.radius = radius;
      this.fill = fill;
      this.stroke = new Color(255, 255, 255, 34);
      setOpaque(false);
    }
    @Override protected void paintComponent(Graphics g) {
      Graphics2D g2 = (Graphics2D) g.create();
      g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g2.setColor(new Color(0, 0, 0, 72));
      g2.fillRoundRect(4, 6, getWidth() - 8, getHeight() - 8, radius, radius);
      g2.setColor(fill);
      g2.fillRoundRect(0, 0, getWidth() - 5, getHeight() - 7, radius, radius);
      g2.setColor(new Color(46, 204, 113, 12));
      g2.fillRoundRect(0, 0, getWidth() - 5, Math.max(1, getHeight() / 2), radius, radius);
      g2.setStroke(new BasicStroke(1f));
      g2.setColor(stroke);
      g2.drawRoundRect(0, 0, getWidth() - 5, getHeight() - 7, radius, radius);
      g2.dispose();
      super.paintComponent(g);
    }
  }

  private static final class RoundedButton extends JButton {
    private final Color fill;
    private final Color fg;
    RoundedButton(String text, Color fill, Color fg) {
      super(text);
      this.fill = fill;
      this.fg = fg;
      setFocusPainted(false);
      setContentAreaFilled(false);
      setBorderPainted(false);
      setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
      setForeground(fg);
      setFont(new Font("Segoe UI", Font.BOLD, 14));
      setBorder(new EmptyBorder(13, 20, 13, 20));
    }
    @Override protected void paintComponent(Graphics g) {
      Graphics2D g2 = (Graphics2D) g.create();
      g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      Color bg = !isEnabled() ? new Color(82, 94, 105) : (getModel().isPressed() ? fill.darker() : (getModel().isRollover() ? fill.brighter() : fill));
      if (getModel().isRollover() && isEnabled()) {
        g2.setColor(new Color(fill.getRed(), fill.getGreen(), fill.getBlue(), 70));
        g2.fillRoundRect(0, 3, getWidth(), getHeight() - 1, 16, 16);
      }
      g2.setColor(bg);
      g2.fillRoundRect(0, 0, getWidth(), getHeight() - 3, 16, 16);
      g2.setColor(new Color(255, 255, 255, 65));
      g2.drawRoundRect(0, 0, getWidth() - 1, getHeight() - 4, 16, 16);
      g2.dispose();
      setForeground(fg);
      super.paintComponent(g);
    }
  }

  private static final class StatCard extends RoundedPanel {
    private final JLabel value = new JLabel("0", SwingConstants.CENTER);
    private final JLabel caption = new JLabel("", SwingConstants.CENTER);
    private final Color accent;
    StatCard(String initial, String text, Color accent) {
      super(new BorderLayout(0, 2), 18, PANEL_2);
      this.accent = accent;
      setPreferredSize(new Dimension(132, 76));
      setBorder(new EmptyBorder(12, 14, 12, 14));
      value.setForeground(accent);
      value.setFont(new Font("Segoe UI", Font.BOLD, 28));
      caption.setForeground(MUTED);
      caption.setFont(new Font("Segoe UI", Font.BOLD, 12));
      add(value, BorderLayout.CENTER);
      add(caption, BorderLayout.SOUTH);
      setValues(initial, text);
    }

    @Override protected void paintComponent(Graphics g) {
      Graphics2D g2 = (Graphics2D) g.create();
      g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g2.setColor(new Color(accent.getRed(), accent.getGreen(), accent.getBlue(), 42));
      g2.fillRoundRect(8, 8, getWidth() - 18, getHeight() - 18, 20, 20);
      g2.dispose();
      super.paintComponent(g);
    }

    void setValues(String nextValue, String nextCaption) {
      value.setText(nextValue);
      value.setForeground(accent);
      caption.setText(nextCaption);
    }
  }

  private final class OrderTableRenderer extends DefaultTableCellRenderer {
    @Override public Component getTableCellRendererComponent(JTable table, Object value, boolean selected, boolean focus, int row, int col) {
      JLabel label = (JLabel) super.getTableCellRendererComponent(table, value, selected, false, row, col);
      int modelRow = table.convertRowIndexToModel(row);
      String status = String.valueOf(table.getModel().getValueAt(modelRow, 4));
      boolean hovered = row == hoveredRow;
      Color rowBg = selected ? new Color(255, 122, 26, 86) : (hovered ? new Color(46, 204, 113, 26) : (row % 2 == 0 ? new Color(13, 21, 29) : new Color(10, 17, 24)));

      label.setOpaque(true);
      label.setFont(col == 1 || col == 4 || col == 5 ? new Font("Segoe UI", Font.BOLD, 15) : UI_FONT);
      label.setForeground(selected ? TEXT : (col == 0 ? GREEN : TEXT));
      label.setBackground(rowBg);
      label.setBorder(new EmptyBorder(0, 14, 0, 14));
      label.setHorizontalAlignment(col == 0 || col == 4 || col == 5 ? SwingConstants.CENTER : SwingConstants.LEFT);

      if (col == 4) {
        label.setText(status);
        label.setHorizontalAlignment(SwingConstants.CENTER);
        label.setForeground(statusColor(status));
        label.setBackground(selected ? new Color(255, 122, 26, 96) : statusBackground(status));
        label.setBorder(BorderFactory.createCompoundBorder(BorderFactory.createLineBorder(new Color(statusColor(status).getRed(), statusColor(status).getGreen(), statusColor(status).getBlue(), 100)), new EmptyBorder(8, 12, 8, 12)));
      }
      return label;
    }
  }

  private static final class FilterRenderer extends DefaultListCellRenderer {
    @Override public Component getListCellRendererComponent(JList<?> list, Object value, int index, boolean selected, boolean focused) {
      JLabel label = (JLabel) super.getListCellRendererComponent(list, value, index, selected, focused);
      label.setOpaque(true);
      label.setFont(UI_FONT);
      label.setBorder(new EmptyBorder(9, 12, 9, 12));
      if (selected) {
        label.setBackground(ORANGE);
        label.setForeground(Color.BLACK);
      } else {
        label.setBackground(index < 0 ? PANEL_2 : PANEL_3);
        label.setForeground(TEXT);
      }
      return label;
    }
  }

  private static final class DarkComboBoxUI extends BasicComboBoxUI {
    @Override protected JButton createArrowButton() {
      JButton button = new JButton("▾");
      button.setBorder(new EmptyBorder(0, 8, 0, 8));
      button.setFocusPainted(false);
      button.setContentAreaFilled(false);
      button.setOpaque(true);
      button.setBackground(PANEL_2);
      button.setForeground(GREEN);
      button.setFont(new Font("Arial", Font.BOLD, 11));
      button.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
      return button;
    }

    @Override public void paintCurrentValueBackground(Graphics g, java.awt.Rectangle bounds, boolean hasFocus) {
      Graphics2D g2 = (Graphics2D) g.create();
      g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
      g2.setColor(PANEL_2);
      g2.fillRoundRect(bounds.x, bounds.y, bounds.width, bounds.height, 10, 10);
      g2.dispose();
    }
  }

  private static final class LetterLabel extends JLabel {
    LetterLabel(String text) { super(text); }
  }

  private static class SpacedLabel extends JLabel {
    SpacedLabel(String text) { super(text); }
  }
}
