/**
 * @file todoController.js
 * @description Xs-Blog 待办事项控制器
 * @author Arran
 * @copyright 2025 Arran ( SuMoChen)
 * @version 1.0.0
 * @created 2025-11-06
 * @repository Gitee https://gitee.com/smochen/Xs-blog
 * @repository Github https://github.com/su16888/Xs-blog
 */

const { Todo } = require('../models');
const TodoTimeLog = require('../models/TodoTimeLog');
const TodoCategory = require('../models/TodoCategory');
const { Op } = require('sequelize');

// 获取所有待办事项
exports.getTodos = async (req, res, next) => {
  try {
    const pagingEnabled = req.query.page !== undefined || req.query.limit !== undefined;
    const { search, status } = req.query;

    const where = {};

    if (status === 'pending') {
      where.is_completed = false;
    } else if (status === 'completed') {
      where.is_completed = true;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const order = [
      ['is_completed', 'ASC'],
      ['created_at', 'DESC']
    ];

    if (!pagingEnabled) {
      const todos = await Todo.findAll({ where, order });
      return res.json({
        success: true,
        data: todos
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const { count, rows } = await Todo.findAndCountAll({
      where,
      order,
      limit,
      offset
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_count: count,
        per_page: limit
      }
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个待办事项
exports.getTodoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const todo = await Todo.findByPk(id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }

    res.json({
      success: true,
      data: todo
    });
  } catch (error) {
    next(error);
  }
};

// 创建待办事项
exports.createTodo = async (req, res, next) => {
  try {
    const {
      title, description, due_date, reminder_enabled, reminder_time, is_completed,
      // v2.5 新增字段
      progress, priority, status, category, estimated_hours, actual_hours,
      parent_id, start_date,
      // v2.6 新增字段
      time_logs
    } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '标题不能为空'
      });
    }

    // 验证进度值
    if (progress !== undefined && (progress < 0 || progress > 100)) {
      return res.status(400).json({
        success: false,
        message: '进度值必须在 0-100 之间'
      });
    }

    const todo = await Todo.create({
      title: title.trim(),
      description: description?.trim() || null,
      due_date: due_date || null,
      reminder_enabled: reminder_enabled || false,
      reminder_time: reminder_time || null,
      reminder_dismissed: false,
      is_completed: is_completed || false,
      // v2.5 新增字段
      progress: progress !== undefined ? progress : 0,
      priority: priority || 'medium',
      status: status || 'todo',
      category: category || null,
      estimated_hours: estimated_hours || null,
      actual_hours: actual_hours || null,
      parent_id: parent_id || null,
      start_date: start_date || null,
      completed_at: (status === 'completed' || is_completed) ? new Date() : null,
      // v2.6 新增字段
      time_logs: Array.isArray(time_logs) ? time_logs : []
    });

    res.status(201).json({
      success: true,
      message: '待办事项创建成功',
      data: todo
    });
  } catch (error) {
    next(error);
  }
};

// 更新待办事项
exports.updateTodo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title, description, due_date, reminder_enabled, reminder_time, is_completed,
      // v2.5 新增字段
      progress, priority, status, category, estimated_hours, actual_hours,
      parent_id, start_date,
      // v2.6 新增字段
      time_logs
    } = req.body;

    const todo = await Todo.findByPk(id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }

    // 验证进度值
    if (progress !== undefined && (progress < 0 || progress > 100)) {
      return res.status(400).json({
        success: false,
        message: '进度值必须在 0-100 之间'
      });
    }

    // 构建更新对象
    const updates = {
      title: title !== undefined ? title.trim() : todo.title,
      description: description !== undefined ? (description?.trim() || null) : todo.description,
      due_date: due_date !== undefined ? (due_date || null) : todo.due_date,
      reminder_enabled: reminder_enabled !== undefined ? reminder_enabled : todo.reminder_enabled,
      reminder_time: reminder_time !== undefined ? (reminder_time || null) : todo.reminder_time,
      is_completed: is_completed !== undefined ? is_completed : todo.is_completed,
      // v2.5 新增字段
      progress: progress !== undefined ? progress : todo.progress,
      priority: priority !== undefined ? priority : todo.priority,
      status: status !== undefined ? status : todo.status,
      category: category !== undefined ? category : todo.category,
      estimated_hours: estimated_hours !== undefined ? estimated_hours : todo.estimated_hours,
      actual_hours: actual_hours !== undefined ? actual_hours : todo.actual_hours,
      parent_id: parent_id !== undefined ? parent_id : todo.parent_id,
      start_date: start_date !== undefined ? start_date : todo.start_date,
      // v2.6 新增字段
      time_logs: time_logs !== undefined ? (Array.isArray(time_logs) ? time_logs : []) : todo.time_logs
    };

    // 如果修改了提醒时间，重置 reminder_dismissed
    if (reminder_time !== undefined && reminder_time !== todo.reminder_time) {
      updates.reminder_dismissed = false;
    }

    // 如果标记为已完成，自动关闭提醒并设置完成时间
    if (updates.is_completed && !todo.is_completed) {
      updates.reminder_dismissed = true;
      updates.completed_at = new Date();
      updates.status = 'completed';
      updates.progress = 100;
    }

    // 如果状态改为已完成
    if (updates.status === 'completed' && todo.status !== 'completed') {
      updates.is_completed = true;
      updates.completed_at = new Date();
      updates.progress = 100;
      updates.reminder_dismissed = true;
    }

    // 如果进度达到100%，自动标记为已完成
    if (updates.progress === 100 && !todo.is_completed) {
      updates.is_completed = true;
      updates.status = 'completed';
      updates.completed_at = new Date();
      updates.reminder_dismissed = true;
    }

    // 如果从已完成改为未完成
    if (!updates.is_completed && todo.is_completed) {
      updates.completed_at = null;
      if (updates.status === 'completed') {
        updates.status = 'in_progress';
      }
    }

    await todo.update(updates);

    res.json({
      success: true,
      message: '待办事项更新成功',
      data: todo
    });
  } catch (error) {
    next(error);
  }
};

// 删除待办事项
exports.deleteTodo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const todo = await Todo.findByPk(id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }

    await todo.destroy();

    res.json({
      success: true,
      message: '待办事项删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 获取待提醒的待办事项
exports.getPendingReminders = async (req, res, next) => {
  try {
    const now = new Date();

    const todos = await Todo.findAll({
      where: {
        reminder_enabled: true,
        reminder_dismissed: false,
        is_completed: false,
        reminder_time: {
          [Op.not]: null,
          [Op.lte]: now
        }
      },
      order: [['reminder_time', 'ASC']]
    });

    res.json({
      success: true,
      data: todos
    });
  } catch (error) {
    next(error);
  }
};

// 忽略/关闭提醒
exports.dismissReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'ignore' 或 'disable'

    const todo = await Todo.findByPk(id);

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }

    if (action === 'ignore') {
      // 本次忽略：不做任何操作，只关闭弹窗
      // 下次检查时如果时间仍然满足条件，会继续提醒
    } else if (action === 'disable') {
      // 禁用提醒功能
      await todo.update({
        reminder_enabled: false,
        reminder_dismissed: true
      });
    } else {
      return res.status(400).json({
        success: false,
        message: '无效的操作，必须是 "ignore" 或 "disable"'
      });
    }

    res.json({
      success: true,
      message: '提醒已处理',
      data: todo
    });
  } catch (error) {
    next(error);
  }
};

// v2.5 新增：获取待办事项统计信息
exports.getTodoStats = async (req, res, next) => {
  try {
    const todos = await Todo.findAll();

    // 基础统计
    const total = todos.length;
    const completed = todos.filter(t => t.is_completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 按状态统计
    const byStatus = {
      todo: todos.filter(t => t.status === 'todo').length,
      in_progress: todos.filter(t => t.status === 'in_progress').length,
      completed: todos.filter(t => t.status === 'completed').length,
      cancelled: todos.filter(t => t.status === 'cancelled').length
    };

    // 按优先级统计
    const byPriority = {
      low: todos.filter(t => t.priority === 'low').length,
      medium: todos.filter(t => t.priority === 'medium').length,
      high: todos.filter(t => t.priority === 'high').length,
      urgent: todos.filter(t => t.priority === 'urgent').length
    };

    // 按分类统计
    const byCategory = {};
    todos.forEach(todo => {
      if (todo.category) {
        byCategory[todo.category] = (byCategory[todo.category] || 0) + 1;
      }
    });

    // 平均进度
    const avgProgress = total > 0
      ? Math.round(todos.reduce((sum, t) => sum + (t.progress || 0), 0) / total)
      : 0;

    // 工时统计
    const totalEstimatedHours = todos.reduce((sum, t) => sum + (parseFloat(t.estimated_hours) || 0), 0);
    const totalActualHours = todos.reduce((sum, t) => sum + (parseFloat(t.actual_hours) || 0), 0);

    // 逾期任务
    const now = new Date();
    const overdue = todos.filter(t =>
      !t.is_completed &&
      t.due_date &&
      new Date(t.due_date) < now
    ).length;

    // 今日到期
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueToday = todos.filter(t => {
      if (!t.due_date || t.is_completed) return false;
      const dueDate = new Date(t.due_date);
      return dueDate >= today && dueDate < tomorrow;
    }).length;

    res.json({
      success: true,
      data: {
        total,
        completed,
        pending,
        completionRate,
        avgProgress,
        overdue,
        dueToday,
        byStatus,
        byPriority,
        byCategory,
        hours: {
          estimated: totalEstimatedHours,
          actual: totalActualHours,
          variance: totalActualHours - totalEstimatedHours
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// v2.5 新增：获取分类列表
// v3.0 更新：从todo_categories表中读取
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await TodoCategory.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// v3.0 新增：分类管理
// ========================================

// 创建分类
exports.createCategory = async (req, res, next) => {
  try {
    const { name, color, icon, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: '分类名称不能为空'
      });
    }

    // 检查分类名称是否已存在
    const existingCategory = await TodoCategory.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '分类名称已存在'
      });
    }

    const category = await TodoCategory.create({
      name,
      color: color || '#3B82F6',
      icon,
      description
    });

    res.status(201).json({
      success: true,
      message: '分类创建成功',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// 更新分类
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, color, icon, description } = req.body;

    const category = await TodoCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 如果修改名称，检查是否与其他分类重复
    if (name && name !== category.name) {
      const existingCategory = await TodoCategory.findOne({ where: { name } });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: '分类名称已存在'
        });
      }
    }

    await category.update({
      name: name || category.name,
      color: color !== undefined ? color : category.color,
      icon: icon !== undefined ? icon : category.icon,
      description: description !== undefined ? description : category.description
    });

    res.json({
      success: true,
      message: '分类更新成功',
      data: category
    });
  } catch (error) {
    next(error);
  }
};

// 删除分类
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const category = await TodoCategory.findByPk(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '分类不存在'
      });
    }

    // 检查是否有待办事项使用了该分类
    const todosWithCategory = await Todo.count({
      where: { category: category.name }
    });

    if (todosWithCategory > 0) {
      return res.status(400).json({
        success: false,
        message: `该分类正在被 ${todosWithCategory} 个待办事项使用，无法删除`
      });
    }

    await category.destroy();

    res.json({
      success: true,
      message: '分类删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// ========================================
// v3.0 新增：时间记录管理
// ========================================

// 获取待办事项的时间记录
exports.getTimeLogs = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查待办事项是否存在
    const todo = await Todo.findByPk(id);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }

    const timeLogs = await TodoTimeLog.findAll({
      where: { todo_id: id },
      order: [['log_date', 'DESC'], ['start_time', 'DESC']]
    });

    res.json({
      success: true,
      data: timeLogs
    });
  } catch (error) {
    next(error);
  }
};

// 创建时间记录
exports.createTimeLog = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { log_date, start_time, end_time, duration, description } = req.body;

    // 检查待办事项是否存在
    const todo = await Todo.findByPk(id);
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: '待办事项不存在'
      });
    }

    if (!log_date || !start_time || !description) {
      return res.status(400).json({
        success: false,
        message: '日期、开始时间和描述不能为空'
      });
    }

    const timeLog = await TodoTimeLog.create({
      todo_id: id,
      log_date,
      start_time,
      end_time,
      duration,
      description
    });

    res.status(201).json({
      success: true,
      message: '时间记录创建成功',
      data: timeLog
    });
  } catch (error) {
    next(error);
  }
};

// 更新时间记录
exports.updateTimeLog = async (req, res, next) => {
  try {
    const { id, logId } = req.params;
    const { log_date, start_time, end_time, duration, description } = req.body;

    const timeLog = await TodoTimeLog.findOne({
      where: { id: logId, todo_id: id }
    });

    if (!timeLog) {
      return res.status(404).json({
        success: false,
        message: '时间记录不存在'
      });
    }

    await timeLog.update({
      log_date: log_date !== undefined ? log_date : timeLog.log_date,
      start_time: start_time !== undefined ? start_time : timeLog.start_time,
      end_time: end_time !== undefined ? end_time : timeLog.end_time,
      duration: duration !== undefined ? duration : timeLog.duration,
      description: description !== undefined ? description : timeLog.description
    });

    res.json({
      success: true,
      message: '时间记录更新成功',
      data: timeLog
    });
  } catch (error) {
    next(error);
  }
};

// 删除时间记录
exports.deleteTimeLog = async (req, res, next) => {
  try {
    const { id, logId } = req.params;

    const timeLog = await TodoTimeLog.findOne({
      where: { id: logId, todo_id: id }
    });

    if (!timeLog) {
      return res.status(404).json({
        success: false,
        message: '时间记录不存在'
      });
    }

    await timeLog.destroy();

    res.json({
      success: true,
      message: '时间记录删除成功'
    });
  } catch (error) {
    next(error);
  }
};

// 别名，用于admin路由
exports.getAllTodos = exports.getTodos;
exports.getTodo = exports.getTodoById;
